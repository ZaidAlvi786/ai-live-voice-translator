'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Mic, Activity, Radio, SkipBack, Power, MessageSquare, Send, Zap } from 'lucide-react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { GlassButton } from '@/components/dom/GlassButton';
import { useAgentStore } from '@/stores/useAgentStore';
import { useMeetingStore } from '@/stores/useMeetingStore'; // Use centralized store
import { Agent } from '@/types';
import { useAudioStream } from '@/hooks/useAudioStream';
import { Canvas } from '@react-three/fiber';
import { ContextOrb } from '@/components/3d/ContextOrb';
import { Stars } from '@react-three/drei';

export default function AgentInterfacePage() {
    const router = useRouter();
    const params = useParams();
    const { agents, fetchAgents } = useAgentStore();
    const {
        activeMeetingId,
        activeTranscript,
        startMeeting,
        endMeeting,
        subscribeToMeeting,
        meetings // access to get meeting details
    } = useMeetingStore();

    const [agent, setAgent] = useState<Agent | null>(null);
    const [inputMessage, setInputMessage] = useState('');

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

    // Derive active meeting object if exists
    const currentMeeting = meetings.find(m => m.id === activeMeetingId);

    // Subscribe to transcript if meeting is active
    useEffect(() => {
        if (activeMeetingId) {
            subscribeToMeeting(activeMeetingId);
        }
    }, [activeMeetingId, subscribeToMeeting]);

    // Audio Stream Hook
    const { connect, disconnect, startAudio, stopAudio, isConnected, isRecording } = useAudioStream({
        meetingId: activeMeetingId || '',
        onConnect: () => {
            console.log("Connected to Neural Core");
            startAudio();
        },
        onDisconnect: () => {
            console.log("Disconnected from Neural Core");
        },
        onError: (err) => console.error("Audio Error:", err)
    });

    // Handle Start/Stop
    const handleToggleSession = async () => {
        if (!agent) return;

        if (activeMeetingId) {
            // Stop
            disconnect();
            await endMeeting(activeMeetingId);
        } else {
            // Start
            try {
                await startMeeting(agent.id, 'webrtc');
                // Connection is handled by useEffect when activeMeetingId updates? 
                // Actually useAudioStream needs the ID. 
                // We'll let the effect below handle connection.
            } catch (e) {
                console.error("Failed to start:", e);
            }
        }
    };

    // Auto-connect audio when meeting starts
    useEffect(() => {
        if (activeMeetingId && !isConnected) {
            connect();
        } else if (!activeMeetingId && isConnected) {
            disconnect();
        }
    }, [activeMeetingId, isConnected, connect, disconnect]);

    // Chat Scroll Ref
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeTranscript]);


    if (!agent) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-white">
                <Activity className="w-10 h-10 animate-pulse text-cyan-400 mb-4" />
                <p className="font-mono text-sm opacity-60">ESTABLISHING NEURAL LINK...</p>
            </div>
        );
    }

    const isLive = !!activeMeetingId;

    return (
        <div className="relative w-full h-[calc(100vh-100px)] flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <GlassButton variant="secondary" onClick={() => router.back()} className="!p-2">
                        <SkipBack className="w-4 h-4" />
                    </GlassButton>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                            {agent.name}
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${isLive
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-white/5 text-white/40 border-white/10'}`}>
                                {isLive ? 'ONLINE' : 'STANDBY'}
                            </span>
                        </h1>
                        <p className="text-white/40 text-xs font-mono mt-1">
                            NEURAL INTERFACE // {agent.id}
                        </p>
                    </div>
                </div>

                {isLive && (
                    <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <div className="flex items-center gap-2">
                            <Zap size={12} className="text-yellow-400" />
                            <span className="text-xs font-mono text-white/60">
                                {currentMeeting?.total_cost ? `$${currentMeeting.total_cost.toFixed(4)}` : "$0.0000"}
                            </span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <Activity size={12} className="text-cyan-400" />
                            <span className="text-xs font-mono text-white/60">
                                {currentMeeting?.duration_seconds || 0}s
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* 3D Visualizer */}
                <GlassCard title="Neural Visualizer" className="lg:col-span-2 relative overflow-hidden !p-0 flex flex-col border-cyan-500/20">
                    <div className="absolute inset-0 bg-black/40" />

                    <div className="absolute inset-0">
                        <Canvas camera={{ position: [0, 0, 6] }}>
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} intensity={1} color="#00F2FF" />
                            <Stars radius={50} count={2000} factor={3} fade speed={1} />

                            <ContextOrb mode={isLive ? 'live' : 'idle'} />
                        </Canvas>
                    </div>

                    <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
                        <GlassButton
                            variant={isLive ? 'secondary' : 'primary'}
                            onClick={handleToggleSession}
                            className={`w-64 py-4 flex items-center justify-center gap-3 font-bold tracking-widest uppercase transition-all ${isLive ? '!bg-red-500/10 !border-red-500/50 !text-red-500 hover:!bg-red-500/20' : 'shadow-[0_0_30px_rgba(0,242,255,0.3)]'
                                }`}
                        >
                            {isLive ? (
                                <><Power className="w-4 h-4" /> Terminate Link</>
                            ) : (
                                <><Mic className="w-4 h-4" /> Initialize Voice Link</>
                            )}
                        </GlassButton>
                    </div>
                </GlassCard>

                {/* Chat / Transcript Interface */}
                <GlassCard title="Live Transcript" className="flex flex-col !p-0 overflow-hidden bg-black/40 backdrop-blur-md">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={14} className="text-cyan-400" /> Live Transcript
                        </span>
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-75" />
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-150" />
                        </div>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm custom-scrollbar">
                        {activeTranscript.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-white/20 p-8">
                                <Activity className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-xs">Awaiting vocal input...</p>
                            </div>
                        ) : (
                            activeTranscript.map((msg: any, i: number) => (
                                <div key={i} className={`flex flex-col ${msg.speaker === 'agent' ? 'items-start' : 'items-end'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-lg ${msg.speaker === 'agent'
                                        ? 'bg-white/5 border border-white/10 text-cyan-100 rounded-tl-none'
                                        : 'bg-cyan-500/10 border border-cyan-500/20 text-white rounded-tr-none'
                                        }`}>
                                        <div className="text-[9px] uppercase tracking-widest opacity-40 mb-1">
                                            {msg.speaker === 'agent' ? agent.name : 'YOU'}
                                        </div>
                                        <div className="leading-relaxed">{msg.content}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Input Area (Mocking text input for now, primarily voice) */}
                    <div className="p-4 border-t border-white/5 bg-white/5">
                        <div className="relative">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Type to inject context..."
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-white text-xs focus:outline-none focus:border-cyan-500/50 transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && inputMessage) {
                                        // TODO: Implement text injection
                                        setInputMessage('');
                                    }
                                }}
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-white/10 text-cyan-400 transition-colors">
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
