'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Mic, Activity, Radio, SkipBack, Power } from 'lucide-react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { GlassButton } from '@/components/dom/GlassButton';
import { useAgentStore } from '@/stores/useAgentStore';
import { Agent, Meeting } from '@/types';
import { useAudioStream } from '@/hooks/useAudioStream';
import { apiRequest } from '@/lib/api';

export default function AgentInterfacePage() {
    const router = useRouter();
    const params = useParams();
    const { agents, fetchAgents } = useAgentStore();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch Agent
    useEffect(() => {
        if (agents.length === 0) fetchAgents();
    }, [agents, fetchAgents]);

    useEffect(() => {
        if (params.agentId && agents.length > 0) {
            const found = agents.find(a => a.id === params.agentId);
            setAgent(found || null);
        }
    }, [params.agentId, agents]);

    // Audio Stream Hook
    const { connect, disconnect, startAudio, stopAudio, isConnected, isRecording } = useAudioStream({
        meetingId: meeting?.id || '',
        onConnect: () => {
            console.log("Connected to Neural Core");
            startAudio(); // Auto-start mic on connect
        },
        onDisconnect: () => {
            console.log("Disconnected from Neural Core");
        },
        onError: (err) => {
            setError("Connection Error: " + err.message);
        }
    });

    // Start Session (Create Meeting & Connect)
    const handleStartSession = useCallback(async () => {
        if (!agent) return;
        try {
            console.log("Initializing Neural Session...");
            const newMeeting = await apiRequest<Meeting>('/meetings/', 'POST', { agent_id: agent.id });
            setMeeting(newMeeting);

            // Connection happens via useEffect when meeting.id is set? 
            // Better to trigger explicit connect to avoid loops if meeting persists.
            // But hook depends on meetingId. 
        } catch (err) {
            console.error("Failed to start session", err);
            setError("Failed to initialize session");
        }
    }, [agent]);

    // Effect to connect when meeting is created
    useEffect(() => {
        if (meeting?.id) {
            connect();
        }
    }, [meeting, connect]);

    const handleEndSession = useCallback(async () => {
        disconnect();
        if (meeting) {
            // Optimistically close
            try {
                await apiRequest(`/meetings/${meeting.id}`, 'PATCH', { status: 'completed' });
            } catch (e) {
                console.error("Failed to close meeting record", e);
            }
        }
        setMeeting(null);
        router.push(`/agents/${agent?.id}/logs`);
    }, [disconnect, meeting, router, agent]);


    if (!agent) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-white">
                <Activity className="w-10 h-10 animate-pulse text-cyan-400 mb-4" />
                <p className="font-mono text-sm opacity-60">ESTABLISHING NEURAL LINK...</p>
            </div>
        );
    }

    const isLive = isConnected && isRecording;

    return (
        <div className="relative w-full min-h-full flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <GlassButton
                    variant="secondary"
                    onClick={() => router.back()}
                    className="!p-2"
                >
                    <SkipBack className="w-4 h-4" />
                </GlassButton>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        {agent.name}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${isLive
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-white/5 text-white/40 border-white/10'}`}>
                            {isLive ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </h1>
                    <p className="text-white/40 text-xs font-mono mt-1">
                        ID: {agent.id} • {agent.role || 'Unassigned Unit'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono">
                    {">"} SYSTEM ERROR: {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                {/* Main Visualizer Area */}
                <GlassCard title="Active Visualizer" className="lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 pointer-events-none" />

                    <div className="flex justify-between items-start z-10">
                        <div className="flex gap-2">
                            {isLive && (
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    <span className="text-[10px] text-red-400 font-mono">LIVE FEED</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                        {/* Audio Orb */}
                        <div className={`relative w-64 h-64 rounded-full border flex items-center justify-center transition-all duration-1000 ${isLive ? 'border-cyan-500/50 animate-pulse-slow' : 'border-white/5'
                            }`}>
                            <div className={`absolute inset-0 rounded-full transition-opacity duration-1000 ${isLive ? 'bg-cyan-500/10 blur-xl opacity-100' : 'bg-transparent opacity-0'
                                }`}></div>
                            <Mic className={`w-16 h-16 transition-colors duration-300 ${isLive ? 'text-cyan-400' : 'text-white/20'
                                }`} />
                        </div>
                    </div>

                    <div className="z-10 flex justify-center gap-4 pt-8">
                        {!isLive ? (
                            <GlassButton
                                variant="primary"
                                onClick={handleStartSession}
                                className="w-48 flex items-center justify-center gap-2"
                            >
                                <Power className="w-4 h-4" />
                                Initialize Link
                            </GlassButton>
                        ) : (
                            <GlassButton
                                variant="primary"
                                onClick={handleEndSession}
                                className="w-48 flex items-center justify-center gap-2 !bg-red-500/20 !border-red-500/30 !text-red-400 hover:!bg-red-500/30"
                            >
                                <Radio className="w-4 h-4" />
                                End Transmission
                            </GlassButton>
                        )}
                    </div>
                </GlassCard>

                {/* Side Panel: Context & Stats */}
                <GlassCard title="Neural Metrics" className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-2">
                        Neural Metrics
                    </h3>

                    <div className="space-y-4">
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <span className="text-[10px] text-white/40 uppercase block mb-1">Latency</span>
                            <span className="text-xl font-mono text-cyan-400">
                                {isLive ? '24' : '--'} <span className="text-xs text-white/40">ms</span>
                            </span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <span className="text-[10px] text-white/40 uppercase block mb-1">Session ID</span>
                            <span className="text-xs font-mono text-white/60 truncate block" title={meeting?.id}>
                                {meeting?.id || 'NO_SESSION'}
                            </span>
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-2 mt-4">
                        Active Context
                    </h3>
                    <div className="flex-1 bg-black/20 rounded-lg p-3 border border-white/5 overflow-y-auto min-h-0 text-xs text-white/60 font-mono">
                        <p>{">"} System initialized...</p>
                        <p>{">"} Voice model: {agent.voice_model_id || 'Default'}</p>
                        {isLive && <p className="text-cyan-400">{">"} Audio stream active...</p>}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
