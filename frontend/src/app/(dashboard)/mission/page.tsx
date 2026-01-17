'use client';

import { useEffect, useState } from 'react';
import { useSpatialStore } from '@/stores/useSpatialStore';
import { useAgentStore } from '@/stores/useAgentStore';
import { useAudioStream } from '@/hooks/useAudioStream'; // New Hook
import { TranscriptStream } from '@/components/mission/TranscriptStream';
import { OverrideSwitch } from '@/components/dom/OverrideSwitch';
import { GlassButton } from '@/components/dom/GlassButton';
import { Mic, MicOff, PhoneOff, Radio } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MissionPage() {
    const router = useRouter();
    const { setMode, setCameraTarget } = useSpatialStore();
    const { activeAgent } = useAgentStore();

    // Audio Streaming Hook
    const { connect, disconnect, startRecording, stopRecording, isConnected, isRecording, messages } = useAudioStream();
    const [meetingId] = useState(`mission-${Math.floor(Math.random() * 1000)}`); // Generate random ID for demo

    useEffect(() => {
        setMode('MISSION');
        setCameraTarget([0, 0, 6]);

        // Auto-Connect on Mount
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/ws';
        connect(`${wsUrl}/${meetingId}`);

        return () => disconnect();
    }, [setMode, setCameraTarget, connect, disconnect, meetingId]);

    const toggleMic = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className="w-full h-screen flex flex-col pt-4 pb-8 px-[5vw]">

            {/* Top Bar */}
            <div className="flex justify-between items-center h-16 border-b border-white/10 mb-6 bg-black/20 backdrop-blur-sm rounded-xl px-6">
                <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px] ${isConnected ? 'bg-red-500 shadow-red-500/50' : 'bg-yellow-500'}`}></div>
                    <span className="text-red-400 font-bold uppercase tracking-widest text-sm">
                        {isConnected ? 'Live Operations' : 'Connecting...'}
                    </span>
                    <span className="text-white/20">|</span>
                    <span className="text-white/60">ID: <span className="text-white font-mono">{meetingId}</span></span>
                </div>
                <div className="flex gap-4">
                    <GlassButton
                        onClick={toggleMic}
                        className={`px-3 py-2 border-white/10 ${isRecording ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white'}`}
                    >
                        {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </GlassButton>
                    <GlassButton
                        variant="danger"
                        className="px-6 py-2 flex items-center gap-2"
                        onClick={() => router.push('/dashboard')}
                    >
                        <PhoneOff className="w-4 h-4" /> End Session
                    </GlassButton>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 grid grid-cols-12 gap-8 min-h-0">

                {/* Left: Transcript & Context */}
                <div className="col-span-12 lg:col-span-8 glass-panel rounded-2xl p-0 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/50">Live Transcript Log</span>
                        <div className="flex items-center gap-2">
                            <Radio className={`w-3 h-3 ${isRecording ? 'text-green-400 animate-pulse' : 'text-white/20'}`} />
                            <span className="text-xs text-white/30">Latency: 12ms</span>
                        </div>
                    </div>
                    <div className="flex-1 p-6 overflow-hidden relative">
                        {/* We pass real messages here if TranscriptStream accepted props, or we update TranscriptStream to use a store. 
                    For this scaffold, since TranscriptStream was self-contained, I will update it in a separate step or just overlay messages here.
                */}
                        <div className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 && <div className="text-white/20 text-center mt-10">Waiting for transmission...</div>}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.speaker === 'agent' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`
                                max-w-[80%] p-4 rounded-xl text-sm
                                ${msg.speaker === 'agent'
                                            ? 'bg-neural-500/20 border border-neural-500/30 text-white rounded-tl-none'
                                            : 'bg-white/5 border border-white/10 text-white/80 rounded-tr-none'}
                            `}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Tactical Controls */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    <div className="glass-panel p-8 rounded-2xl flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-crimson-900/10">
                        <OverrideSwitch />
                    </div>
                    <div className="glass-card p-6 h-40">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Confidence Score</h3>
                        <div className="flex items-end gap-2 text-4xl font-bold text-white mb-2">
                            94<span className="text-sm text-green-400 mb-2">%</span>
                        </div>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full w-[94%] shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}
