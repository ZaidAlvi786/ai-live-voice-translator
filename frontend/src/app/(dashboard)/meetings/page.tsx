'use client';

import { useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useMeetingStore } from '@/stores/useMeetingStore';
import { useAgentStore } from '@/stores/useAgentStore';
import * as THREE from 'three';
import { useAudioStream } from '@/hooks/useAudioStream';

// Components
import { ContextOrb } from '@/components/3d/ContextOrb';
import { CameraRig } from '@/components/3d/CameraRig';
// import { MeetingSlab } from './MeetingSlab'; // I'll inline this or create it if complex
// import { MeetingModal } from './MeetingModal'; // Inline or refactor

// --- INLINE COMPONENTS FOR SPEEDY REFACTOR ---

import { Float, Text, useCursor } from '@react-three/drei';
import { motion as motion3d } from 'framer-motion-3d';
import { motion } from 'framer-motion';
import { Activity, Cpu, Clock, Zap, Link as LinkIcon, Globe, CheckCircle } from 'lucide-react';

// Reuse existing Modal logic but enhanced
const SpatialModal = ({ meeting, activeTranscript, onClose, onEnd }: any) => {
    const [showSummary, setShowSummary] = useState(false);

    if (!meeting) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto" onClick={onClose} />

            {/* Content */}
            <motion.div
                initial={{ scale: 0.9, y: 50, rotateX: 10 }}
                animate={{ scale: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.9, y: 50, opacity: 0 }}
                className="pointer-events-auto relative w-[900px] h-[600px] bg-black/80 border border-[#00F2FF]/20 rounded-xl overflow-hidden shadow-[0_0_100px_rgba(0,242,255,0.1)] flex"
                onClick={(e) => e.stopPropagation()}
            >
                {!showSummary ? (
                    <>
                        {/* Left: Intel */}
                        <div className="w-1/3 border-r border-white/10 bg-white/5 p-8 flex flex-col gap-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">{meeting.title || "SESSION 01"}</h2>
                                <div className="flex items-center gap-2 text-[#00F2FF] text-xs font-mono uppercase tracking-widest">
                                    <span className={`w-2 h-2 rounded-full ${meeting.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    {meeting.status}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-black/40 rounded border border-white/5">
                                    <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                                        <Cpu size={14} /> COMPUTE LOAD
                                    </div>
                                    <div className="text-xl font-mono text-white">
                                        {meeting.total_cost ? `$${meeting.total_cost.toFixed(4)}` : "$0.0000"}
                                    </div>
                                    <div className="w-full h-1 bg-white/10 mt-2 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#00F2FF]"
                                            style={{ width: `${Math.min((meeting.total_cost || 0) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-black/40 rounded border border-white/5">
                                    <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                                        <Clock size={14} /> DURATION
                                    </div>
                                    <div className="text-xl font-mono text-white">
                                        {meeting.duration_seconds
                                            ? `${Math.floor(meeting.duration_seconds / 60)}m ${meeting.duration_seconds % 60}s`
                                            : "0m 0s"}
                                    </div>
                                </div>
                            </div>

                            {meeting.status === 'active' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEnd(meeting.id);
                                        setShowSummary(true);
                                    }}
                                    className="mt-auto py-3 bg-red-500/10 border border-red-500/50 hover:bg-red-500/20 text-red-500 font-bold uppercase tracking-widest text-xs transition-colors rounded"
                                >
                                    Terminate Session
                                </button>
                            )}
                        </div>

                        {/* Right: Transcript */}
                        <div className="flex-1 bg-black/90 p-8 flex flex-col">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-6">Live Neural Transcript</h3>

                            <div className="flex-1 overflow-y-auto space-y-4 text-sm font-mono custom-scrollbar">
                                {activeTranscript && activeTranscript.length > 0 ? (
                                    activeTranscript.map((t: any, i: number) => (
                                        <div key={i} className="flex gap-4">
                                            <span className={t.speaker === 'agent' ? "text-[#00F2FF]" : "text-white/40"}>
                                                {t.speaker === 'agent' ? 'AI' : 'USER'} //
                                            </span>
                                            <span className="text-white/80">{t.content}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-white/20 gap-4">
                                        <Activity size={40} className="animate-pulse" />
                                        <p>AWAITING SIGNAL...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center space-y-8 bg-black/90">
                        <div className="w-20 h-20 rounded-full bg-[#00F2FF]/20 flex items-center justify-center mb-4 shadow-[0_0_50px_rgba(0,242,255,0.2)]">
                            <CheckCircle size={40} className="text-[#00F2FF]" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight mb-2">MISSION REPORT</h2>
                            <p className="text-white/40 font-mono text-sm uppercase tracking-widest">Session Concluded Successfully</p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-xs text-white/40 uppercase mb-2">Total Tokens</div>
                                <div className="text-2xl font-mono text-white">{(meeting.total_cost * 50000).toFixed(0)}</div>
                            </div>
                            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-xs text-white/40 uppercase mb-2">Final Cost</div>
                                <div className="text-2xl font-mono text-[#00F2FF]">${meeting.total_cost.toFixed(4)}</div>
                            </div>
                            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-xs text-white/40 uppercase mb-2">Duration</div>
                                <div className="text-2xl font-mono text-white">{Math.floor(meeting.duration_seconds / 60)}m {meeting.duration_seconds % 60}s</div>
                            </div>
                        </div>

                        <div className="w-full max-w-2xl p-6 bg-white/5 rounded-xl border border-white/10 text-left">
                            <div className="text-xs text-white/40 uppercase mb-4 flex items-center gap-2">
                                <Activity size={12} /> Neural Analysis
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed font-mono">
                                [SYSTEM EXTRACT] The session focused on architectural patterns for high-concurrency systems. The agent recommended Kubernetes and Redis caching strategies. Sentiment analysis indicates a high degree of user engagement and technical alignment.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-[#00F2FF] hover:bg-[#00dbe6] text-black font-bold uppercase tracking-widest text-sm rounded transition-all shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                        >
                            Return to Command Center
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

// Inline MeetingSlab (Enhanced)
const EnhancedMeetingSlab = ({ meeting, position, onClick }: any) => {
    const [hovered, setHovered] = useState(false);
    useCursor(hovered);

    return (
        <group position={position}>
            {/* Connection Line to Arc baseline? Maybe too clutter. Keep simple. */}

            <motion3d.group
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                animate={{
                    scale: hovered ? 1.1 : 1,
                    z: hovered ? 1 : 0
                }}
            >
                <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
                    <mesh rotation={[0, 0, 0]}>
                        <boxGeometry args={[2.5, 3.5, 0.1]} />
                        <meshPhysicalMaterial
                            color={meeting.status === 'live' ? "#1a0505" : "#05101a"}
                            emissive={meeting.status === 'live' ? "#ff0000" : "#00F2FF"}
                            emissiveIntensity={hovered ? 0.4 : 0.1}
                            transmission={0.6}
                            thickness={1}
                            roughness={0.2}
                            metalness={0.8}
                            clearcoat={1}
                        />
                    </mesh>

                    {/* Holographic Text */}
                    <group position={[-1, 1.4, 0.1]}>
                        <Text fontSize={0.15} color="white" anchorX="left" maxWidth={2}>
                            {meeting.title || "SESSION"}
                        </Text>
                        <Text position={[0, -0.25, 0]} fontSize={0.1} color={meeting.status === 'live' ? 'red' : 'cyan'} anchorX="left">
                            {meeting.status.toUpperCase()}
                        </Text>
                    </group>
                </Float>
            </motion3d.group>
        </group>
    )
}

// --- PAGE ---

export default function MeetingsPage() {
    const { meetings, fetchMeetings, activeMeetingId, setActiveMeeting, activeTranscript, subscribeToMeeting, viewMode, setViewMode, startMeeting, endMeeting } = useMeetingStore();
    const { agents, fetchAgents } = useAgentStore();

    // Audio Stream Hook
    const { connect, disconnect, startAudio } = useAudioStream({
        meetingId: activeMeetingId || '',
        onConnect: () => {
            console.log("Audio Connected - Starting Mic");
            startAudio();
        },
        onError: (err) => console.error("Audio Stream Error:", err)
    });

    useEffect(() => {
        if (activeMeetingId) {
            connect();
        } else {
            disconnect();
        }
    }, [activeMeetingId]);

    // Agent Selector State
    const [showAgentSelector, setShowAgentSelector] = useState(false);
    const [joinMode, setJoinMode] = useState<'internal' | 'external'>('internal');
    const [externalUrl, setExternalUrl] = useState('');

    useEffect(() => {
        fetchMeetings();
        fetchAgents();
    }, []);

    // Effect: Handle ViewMode based on active selection
    useEffect(() => {
        if (activeMeetingId) {
            setViewMode('detail');
            subscribeToMeeting(activeMeetingId); // Ensure sub
        } else {
            setViewMode('timeline'); // Use 'timeline' not 'idle' for browsing
        }
    }, [activeMeetingId]);

    // Calculate Slab Positions on a Temporal Arc (Parabola or Spiral)
    const slabPositions = useMemo(() => {
        return meetings.map((m, i) => {
            // Formula for Arc:
            // x spread out
            // z curves back
            const offset = i - (meetings.length / 2);
            const x = offset * 3;
            const z = Math.abs(offset) * 1.5; // Parabola
            return new THREE.Vector3(x, 0, -z);
        });
    }, [meetings]);

    // Active Meeting Position for Camera Focus
    const activeMeetingIndex = meetings.findIndex(m => m.id === activeMeetingId);
    const targetFocus = activeMeetingIndex !== -1 ? slabPositions[activeMeetingIndex] : undefined;

    return (
        <div className="relative w-full h-full bg-[#020408] overflow-hidden">

            {/* 3D Viewport */}
            <div className="absolute inset-0">
                <Canvas shadows camera={{ position: [0, 2, 10], fov: 45 }} frameloop="always"> {/* Always for orb shader, could opt demand if needed */}
                    <color attach="background" args={['#020408']} />
                    <fog attach="fog" args={['#020408', 5, 25]} />

                    <ambientLight intensity={0.2} />
                    <pointLight position={[10, 10, 10]} intensity={1} color="#00F2FF" />
                    <pointLight position={[-10, 5, -10]} intensity={2} color="#ff0080" />

                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                    {/* Camera Controller */}
                    <CameraRig viewMode={viewMode} targetPosition={targetFocus} />

                    {/* Scene Content */}
                    <group position={[0, 0, 0]}>

                        {/* Central Neural Orb (Visual Anchor) */}
                        <group position={[0, 2, -5]}>
                            <ContextOrb mode={
                                activeMeetingId ? 'analysis' :
                                    (meetings.some(m => m.status === 'live') ? 'live' : 'idle')
                            } />
                        </group>

                        {/* Meetings Temporal Arc */}
                        <group position={[0, -1, 0]}>
                            {meetings.map((meeting, i) => (
                                <EnhancedMeetingSlab
                                    key={meeting.id}
                                    meeting={meeting}
                                    position={slabPositions[i]}
                                    onClick={() => setActiveMeeting(meeting.id)}
                                />
                            ))}
                        </group>

                        {/* Floor Reflection or Grid? Keep minimal. */}
                        <gridHelper args={[50, 50, '#111', '#050505']} position={[0, -3, 0]} />
                    </group>
                </Canvas>
            </div>

            {/* UI Layer (HUD) */}
            <div className="absolute top-0 left-0 p-8 pointer-events-none">
                <h1 className="text-4xl font-black text-white tracking-tighter opacity-20">NEURALIS</h1>
                <div className="mt-2 text-xs font-mono text-[#00F2FF] flex items-center gap-2">
                    <Zap size={12} />
                    SPATIAL INTERFACE ACTIVE
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {/* Agent Selector Overlay */}
                {showAgentSelector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowAgentSelector(false)}
                    >
                        <motion.div
                            className="bg-[#050505] border border-white/10 rounded-xl p-8 w-[500px] pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Initiate Session</h2>
                                <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                    <button
                                        onClick={() => setJoinMode('internal')}
                                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${joinMode === 'internal' ? 'bg-[#00F2FF] text-black shadow-[0_0_10px_rgba(0,242,255,0.3)]' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Internal Voice
                                    </button>
                                    <button
                                        onClick={() => setJoinMode('external')}
                                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${joinMode === 'external' ? 'bg-[#00F2FF] text-black shadow-[0_0_10px_rgba(0,242,255,0.3)]' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Join External
                                    </button>
                                </div>
                            </div>

                            {joinMode === 'external' && (
                                <div className="mb-6 space-y-2">
                                    <label className="text-xs text-white/40 font-mono uppercase">Meeting URL (Meet / Zoom)</label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                        <input
                                            type="text"
                                            value={externalUrl}
                                            onChange={(e) => setExternalUrl(e.target.value)}
                                            placeholder="https://meet.google.com/..."
                                            className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:border-[#00F2FF]/50 focus:outline-none font-mono text-sm"
                                        />
                                    </div>
                                    <div className="text-xs text-[#00F2FF]/60 flex items-center gap-1">
                                        <Globe size={10} /> Supports Google Meet, Zoom, Teams
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar">
                                <div className="text-xs text-white/20 font-mono uppercase mb-2">Select Agent to {joinMode === 'external' ? 'Dispatch' : 'Activate'}</div>
                                {agents.map(agent => (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            if (joinMode === 'external' && !externalUrl) {
                                                alert("Please enter a meeting URL");
                                                return;
                                            }
                                            startMeeting(
                                                agent.id,
                                                joinMode === 'external' ? (externalUrl.includes('zoom') ? 'zoom' : 'google_meet') : 'webrtc',
                                                joinMode === 'external' ? externalUrl : undefined
                                            );
                                            setShowAgentSelector(false);
                                            setExternalUrl('');
                                        }}
                                        className="w-full p-4 flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#00F2FF]/50 rounded-lg group transition-all"
                                    >
                                        <div className="text-left">
                                            <div className="text-white font-medium group-hover:text-[#00F2FF]">{agent.name}</div>
                                            <div className="text-white/40 text-xs">{agent.personality_config?.confidence ? 'High Confidence' : 'Balanced'}</div>
                                        </div>
                                        <Zap size={16} className="text-white/20 group-hover:text-[#00F2FF]" />
                                    </button>
                                ))}
                                {agents.length === 0 && (
                                    <div className="text-white/30 text-center py-4">No agents available. Create one first.</div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {activeMeetingId && (
                    <SpatialModal
                        meeting={meetings.find(m => m.id === activeMeetingId)}
                        activeTranscript={activeTranscript}
                        onClose={() => setActiveMeeting(null)}
                        onEnd={(id: string) => endMeeting(id)}
                    />
                )}
            </AnimatePresence>

            {/* FAB for Start */}
            {!activeMeetingId && !showAgentSelector && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute bottom-8 right-8 z-40 bg-[#00F2FF] text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:scale-110 transition-transform"
                    onClick={() => setShowAgentSelector(true)}
                >
                    <Zap size={24} />
                </motion.button>
            )}

        </div>
    );
}
