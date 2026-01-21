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
    ingestNode: (file: File) => Promise<void>;
    uploadPendingNodes: (agentId: string, token: string) => Promise<void>;
    removeNode: (id: string) => void;
}

const MOCK_NODES: KnowledgeNode[] = [];

export const useNeuralMapStore = create<KnowledgeCortexState>((set, get) => ({
    isKnowledgeModalOpen: false,
    openKnowledgeModal: () => set({ isKnowledgeModalOpen: true }),
    closeKnowledgeModal: () => set({ isKnowledgeModalOpen: false }),

    ingestionState: 'idle',
    ingestionProgress: 0,
    setIngestionState: (state) => set({ ingestionState: state }),

    nodes: MOCK_NODES,
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

        // Update nodes to 'synced' visually (simple refresher)
        set((state) => ({
            nodes: state.nodes.map(n => n.status === 'queued' ? { ...n, status: 'synced', relevancy: 100 } : n)
        }));

        setTimeout(() => set({ ingestionState: 'idle', ingestionProgress: 0 }), 2000);
    },

    removeNode: (id) => set((state) => ({
        nodes: state.nodes.filter(n => n.id !== id)
    }))
}));
