import { create } from 'zustand';
import { Agent, AgentPersonality } from '@/types';
import { apiRequest } from '@/lib/api';

interface AgentState {
    agents: Agent[];
    activeAgent: Agent | null;
    draftAgent: Partial<Agent>; // For creation flow

    setAgents: (agents: Agent[]) => void;
    setActiveAgent: (agent: Agent | null) => void;
    updateDraft: (update: Partial<Agent>) => void;
    createAgent: () => Promise<void>;
}

const DEFAULT_PERSONALITY: AgentPersonality = {
    confidence: 0.5,
    empathy: 0.5,
    technical: 0.5,
    speed: 1.0,
};

export const useAgentStore = create<AgentState>((set, get) => ({
    agents: [],
    activeAgent: null,
    draftAgent: {
        personality_config: DEFAULT_PERSONALITY,
        status: 'creating'
    },

    setAgents: (agents) => set({ agents }),
    setActiveAgent: (activeAgent) => set({ activeAgent }),
    updateDraft: (update) => set((state) => ({
        draftAgent: { ...state.draftAgent, ...update }
    })),
    createAgent: async () => {
        const { draftAgent } = get();
        try {
            const response = await apiRequest<Agent>('/agents/', 'POST', draftAgent);
            set((state) => ({
                agents: [...state.agents, response],
                activeAgent: response
            }));
            console.log("Agent Created via API", response);
        } catch (error) {
            console.error("Failed to create agent", error);
            throw error;
        }
    },
    fetchAgents: async () => {
        try {
            const response = await apiRequest<Agent[]>('/agents/');
            set({ agents: response });
        } catch (error) {
            console.error("Failed to fetch agents", error);
        }
    }
}));
