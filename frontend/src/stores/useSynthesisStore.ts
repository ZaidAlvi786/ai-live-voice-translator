import { create } from 'zustand';

export type CoreMode = 'stasis' | 'listening' | 'sculpting' | 'synthesizing' | 'complete';
export type CameraState = 'overview' | 'focus' | 'cinematic';

interface KnowledgeNode {
    id: string;
    label: string;
    type: 'pdf' | 'audio' | 'doc';
    status: 'synced' | 'processing' | 'pending';
    size: number;
}

interface SynthesisState {
    // Core State
    coreMode: CoreMode;
    setCoreMode: (mode: CoreMode) => void;

    // Personality Matrix
    confidence: number;
    empathy: number;
    technical: number;
    setConfidence: (val: number) => void;
    setEmpathy: (val: number) => void;
    setTechnical: (val: number) => void;

    // Assets
    voiceFile: File | null;
    voiceUploaded: boolean;
    setVoiceFile: (file: File | null) => void;

    knowledgeNodes: KnowledgeNode[];
    addKnowledgeNode: (node: KnowledgeNode) => void;

    // Scene
    cameraState: CameraState;
    setCameraState: (state: CameraState) => void;

    // Actions
    uploadVoiceSample: (agentId: string, token: string) => Promise<void>;
    reset: () => void;
}

export const useSynthesisStore = create<SynthesisState>((set, get) => ({
    coreMode: 'stasis',
    setCoreMode: (mode) => set({ coreMode: mode }),

    confidence: 50,
    empathy: 50,
    technical: 50,
    setConfidence: (val) => set({ confidence: val, coreMode: 'sculpting' }),
    setEmpathy: (val) => set({ empathy: val, coreMode: 'sculpting' }),
    setTechnical: (val) => set({ technical: val, coreMode: 'sculpting' }),

    voiceFile: null,
    voiceUploaded: false,
    setVoiceFile: (file) => set({ voiceFile: file, voiceUploaded: !!file }),

    knowledgeNodes: [
        { id: '1', label: 'Resume_v2.pdf', type: 'pdf', status: 'synced', size: 1.2 },
    ],
    addKnowledgeNode: (node) => set((state) => ({ knowledgeNodes: [...state.knowledgeNodes, node] })),

    cameraState: 'overview',
    setCameraState: (state) => set({ cameraState: state }),

    uploadVoiceSample: async (agentId, token) => {
        const { voiceFile } = get();
        if (!voiceFile) return;

        const formData = new FormData();
        formData.append('file', voiceFile);

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

        const res = await fetch(`${API_URL}/training/${agentId}/enroll_voice`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Voice upload failed');
        }
    },

    reset: () => set({
        coreMode: 'stasis',
        confidence: 50,
        empathy: 50,
        technical: 50,
        voiceFile: null,
        voiceUploaded: false,
        cameraState: 'overview'
    })
}));
