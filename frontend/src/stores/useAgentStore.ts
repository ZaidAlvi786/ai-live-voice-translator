import { create } from 'zustand';
import { Agent, AgentPersonality, Meeting } from '@/types';
import { apiRequest } from '@/lib/api';

interface AgentState {
    agents: Agent[];
    activeAgent: Agent | null;
    draftAgent: Partial<Agent>; // For creation flow
    meetings: Meeting[]; // Neural Logs

    setAgents: (agents: Agent[]) => void;
    setActiveAgent: (agent: Agent | null) => void;
    updateDraft: (update: Partial<Agent>) => void;
    createAgent: () => Promise<void>;
    fetchAgents: () => Promise<void>;
    fetchMeetings: (agentId: string) => Promise<void>;
    updateAgent: (agentId: string, update: Partial<Agent>) => Promise<Agent>;
    deleteAgent: (agentId: string) => Promise<void>;
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
    meetings: [],

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
    },
    fetchMeetings: async (agentId: string) => {
        try {
            const response = await apiRequest<Meeting[]>(`/meetings/?agent_id=${agentId}`);
            set({ meetings: response });
        } catch (error) {
            console.error("Failed to fetch meetings", error);
            set({ meetings: [] });
        }
    },
    updateAgent: async (agentId: string, update: Partial<Agent>) => {
        try {
            const response = await apiRequest<Agent>(`/agents/${agentId}`, 'PATCH', update);
            set((state) => ({
                agents: state.agents.map((a) => (a.id === agentId ? response : a)),
                activeAgent: state.activeAgent?.id === agentId ? response : state.activeAgent
            }));
            return response;
        } catch (error) {
            console.error("Failed to update agent", error);
            throw error;
        }
    },
    deleteAgent: async (agentId: string) => {
        try {
            await apiRequest(`/agents/${agentId}`, 'DELETE');
            set((state) => ({
                agents: state.agents.filter((a) => a.id !== agentId),
                activeAgent: state.activeAgent?.id === agentId ? null : state.activeAgent
            }));
        } catch (error) {
            console.error("Failed to delete agent", error);
            throw error;
        }
    }
}));
