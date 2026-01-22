export interface User {
    id: string;
    email: string;
    name?: string;
    full_name?: string;
    avatar_url?: string | null;
    created_at?: string;
}

export interface Agent {
    id: string;
    name: string;
    role?: string; // Backend doesn't return this yet, optional for now
    personality_config: AgentPersonality;
    voice_model_id?: string;
    system_prompt?: string;
    created_at?: string;
    user_id?: string;
    status?: string;
    latency?: number; // For UI display
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
    user_id: string;
    started_at: string;
    ended_at?: string;
    summary?: string;
    recording_url?: string;
    status: string;
    total_cost?: number; // Enriched
    duration_seconds?: number; // Enriched
    platform?: 'webrtc' | 'google_meet' | 'zoom';
    external_url?: string;
}

export interface TelemetryPoint {
    metric: string;
    value: number;
    timestamp: number;
}

export interface VoiceModel {
    id: string;
    name: string;
    provider: string;
    voice_id: string;
    category: string;
}

export interface AgentTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    default_config: AgentPersonality;
}

export interface AgentOptions {
    voice_models: VoiceModel[];
    templates: AgentTemplate[];
}
