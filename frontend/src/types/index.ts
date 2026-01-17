export interface User {
    id: string;
    email: string;
    name?: string;
    created_at: string;
}

export interface Agent {
    id: string;
    user_id: string;
    name: string;
    voice_model_id?: string;
    personality_config: AgentPersonality;
    accent?: string;
    status: 'creating' | 'ready' | 'active' | 'offline';
    created_at: string;
}

export interface AgentPersonality {
    friendliness: number;
    intelligence: number;
    creativity: number;
    speed: number;
}

export interface Meeting {
    id: string;
    agent_id: string;
    meeting_type: string;
    started_at: string;
    ended_at?: string;
    outcome_summary?: string;
}

export interface TelemetryPoint {
    metric: string;
    value: number;
    timestamp: number;
}
