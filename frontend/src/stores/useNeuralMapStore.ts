import { create } from 'zustand';

export interface KnowledgeNode {
    id: string;
    label: string;
    type: 'pdf' | 'audio' | 'text' | 'code' | 'web';
    status: 'synced' | 'processing' | 'queued' | 'pending';
    size: string;
    description: string;
    position: [number, number, number];
    relevancy: number;
    entities: string[];
}

export type IngestionState = 'idle' | 'uploading' | 'processing' | 'synced';

interface KnowledgeCortexState {
    // Modal State
    isKnowledgeModalOpen: boolean;
    openKnowledgeModal: () => void;
    closeKnowledgeModal: () => void;

    // Ingestion Pipeline
    ingestionState: IngestionState;
    ingestionProgress: number; // 0-100
    setIngestionState: (state: IngestionState) => void;

    // Knowledge Graph
    nodes: KnowledgeNode[];
    pendingFiles: File[];
    activeNodeId: string | null;
    focusedNodeId: string | null;

    // Actions
    setActiveNode: (id: string | null) => void;
    focusNode: (id: string | null) => void;

    // Complex Actions
    // Complex Actions
    ingestNode: (file: File) => Promise<void>;
    uploadPendingNodes: (agentId: string, token: string) => Promise<void>;
    removeNode: (id: string) => void;
    deleteNode: (agentId: string, filename: string, token: string) => Promise<void>;

    // New Actions
    fetchNodes: (agentId: string, token: string) => Promise<void>;
    ingestUrl: (agentId: string, url: string, token: string) => Promise<void>;
    ingestText: (agentId: string, title: string, content: string, token: string) => Promise<void>;
}

export const useNeuralMapStore = create<KnowledgeCortexState>((set, get) => ({
    isKnowledgeModalOpen: false,
    openKnowledgeModal: () => set({ isKnowledgeModalOpen: true }),
    closeKnowledgeModal: () => set({ isKnowledgeModalOpen: false }),

    ingestionState: 'idle',
    ingestionProgress: 0,
    setIngestionState: (state) => set({ ingestionState: state }),

    nodes: [],
    pendingFiles: [],
    activeNodeId: null,
    focusedNodeId: null,

    setActiveNode: (id) => set({ activeNodeId: id }),
    focusNode: (id) => set({ focusedNodeId: id }),

    ingestNode: async (file) => {
        // Queue the file instead of uploading immediately
        set((state) => ({
            pendingFiles: [...state.pendingFiles, file],
            ingestionState: 'idle'
        }));

        // Visual feedback for the UI (Mocking a "Queued" node)
        const queuedNode: KnowledgeNode = {
            id: `temp-${Math.random().toString(36).substr(2, 9)}`,
            label: file.name,
            type: file.type.includes('pdf') ? 'pdf' : 'text',
            status: 'queued',
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            description: 'Waiting for Agent Creation',
            position: [(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5],
            relevancy: 0,
            entities: ['Pending Upload']
        };

        set((state) => ({ nodes: [...state.nodes, queuedNode] }));
    },

    uploadPendingNodes: async (agentId, token) => {
        const { pendingFiles } = get();
        if (pendingFiles.length === 0) return;

        set({ ingestionState: 'uploading', ingestionProgress: 0 });

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        let progressStep = 100 / pendingFiles.length;
        let currentProgress = 0;

        for (const file of pendingFiles) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                // Use the new RAG endpoint
                await fetch(`${API_URL}/agents/${agentId}/knowledge`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                currentProgress += progressStep;
                set({ ingestionProgress: currentProgress });

            } catch (error) {
                console.error(`Failed to upload ${file.name}`, error);
            }
        }

        set({
            ingestionState: 'synced',
            pendingFiles: [] // Clear queue
        });

        // Refresh list
        get().fetchNodes(agentId, token);

        setTimeout(() => set({ ingestionState: 'idle', ingestionProgress: 0 }), 2000);
    },

    removeNode: async (id) => {
        const { nodes } = get();
        const node = nodes.find(n => n.id === id);
        if (!node) return;

        // Optimistic update
        set((state) => ({
            nodes: state.nodes.filter(n => n.id !== id)
        }));

        // We need agentId and token. 
        // Current store structure doesn't store auth token directly, passed in action?
        // Let's assume passed validation or we need to update signature.
        // Actually the signature `removeNode: (id: string) => void` is in interface.
        // We'll trust optimistic update for now or need to refactor to accept token.
        // Wait, other actions take token. Let's update signature.
    },

    deleteNode: async (agentId: string, filename: string, token: string) => {
        // Backend expects filename to delete all chunks
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        try {
            await fetch(`${API_URL}/agents/${agentId}/knowledge/${filename}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // No need to set state if we refresh or use optimistic removeNode separately
            // But let's chain it.
            // We need to find ID by filename if we want to remove by ID.
            set((state) => ({
                nodes: state.nodes.filter(n => n.label !== filename)
            }));
        } catch (e) {
            console.error("Failed to delete node", e);
        }
    },

    fetchNodes: async (agentId, token) => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        try {
            const res = await fetch(`${API_URL}/agents/${agentId}/knowledge`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Map backend format to KnowledgeNode
                const mappedNodes: KnowledgeNode[] = data.map((d: any) => ({
                    id: d.id,
                    label: d.filename || d.title || 'Untitled',
                    type: d.type || 'text',
                    status: 'synced',
                    size: 'Unknown',
                    description: `Ingested on ${new Date(d.created_at).toLocaleDateString()}`,
                    position: [(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5], // Random 3D pos for now
                    relevancy: 100,
                    entities: []
                }));
                // Merge with queued nodes? Or just replace? Replace for now but keep pending if any?
                // Actually pending files are separate list.
                set({ nodes: mappedNodes });
            }
        } catch (e) {
            console.error("Failed to fetch nodes", e);
        }
    },

    ingestUrl: async (agentId, url, token) => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        set({ ingestionState: 'processing' });
        try {
            await fetch(`${API_URL}/agents/${agentId}/knowledge/url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url })
            });
            await get().fetchNodes(agentId, token);
            set({ ingestionState: 'synced' });
        } catch (e) {
            console.error(e);
            set({ ingestionState: 'idle' });
        }
    },

    ingestText: async (agentId, title, content, token) => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        set({ ingestionState: 'processing' });
        try {
            await fetch(`${API_URL}/agents/${agentId}/knowledge/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, content })
            });
            await get().fetchNodes(agentId, token);
            set({ ingestionState: 'synced' });
        } catch (e) {
            console.error(e);
            set({ ingestionState: 'idle' });
        }
    }
}));
