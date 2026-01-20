export interface User {
    id: string;
    email: string;
    name?: string;
    created_at: string;
}

export interface AgentResponse extends Agent { }

export interface AgentPersonality {
    confidence: number;
    empathy: number;
    technical: number;
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
