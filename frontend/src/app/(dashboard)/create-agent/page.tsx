'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Mic, Upload, Cpu, Database, CheckCircle, Zap, FileText, Settings, HelpCircle, User } from 'lucide-react';
import { useSynthesisStore } from '@/stores/useSynthesisStore';
import { SynthesisCore } from '@/components/canvas/SynthesisCore';
import { ParticleCloud } from '@/components/canvas/ParticleCloud';
import { Html } from '@react-three/drei';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNeuralMapStore } from '@/stores/useNeuralMapStore';
import { KnowledgeBaseModal } from '@/components/knowledge/KnowledgeBaseModal';

// --- VISUAL COMPONENTS ---

const Header = () => (
    <header className="absolute top-0 left-0 right-0 z-30 px-8 py-5 flex justify-between items-center border-b border-white/5 bg-[#05080a]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded bg-[#00F2FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.3)]">
                {/* Beaker Icon (Abstract) */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2v7.31" /><path d="M14 2v7.31" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
                </svg>
            </div>
            <div>
                <h1 className="text-sm font-bold tracking-[0.1em] text-white uppercase font-sans">
                    DIGITAL TWIN // SYNTHESIS LAB
                </h1>
                <p className="text-[10px] text-white/40 font-mono tracking-widest mt-0.5">
                    v1.0.4 // SYSTEM ACTIVE
                </p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <button className="p-2 rounded hover:bg-white/5 transition-colors text-white/60"><Settings className="w-4 h-4" /></button>
            <button className="p-2 rounded hover:bg-white/5 transition-colors text-white/60"><HelpCircle className="w-4 h-4" /></button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#142C3D] to-[#0B111D] border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/50">JD</div>
        </div>
    </header>
);

const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-[#00F2FF]" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">{title}</h2>
    </div>
);

const CustomSlider = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
    <div className="space-y-3">
        <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-white tracking-wider uppercase">{label}</span>
            <span className="px-2 py-0.5 rounded bg-[#142C3D] border border-cyan-900/30 text-[10px] font-mono text-[#00F2FF]">
                {value}%
            </span>
        </div>
        <div className="relative h-1.5 bg-[#142C3D] rounded-full overflow-hidden cursor-pointer group">
            <input
                type="range"
                min="0" max="100"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-600 to-[#00F2FF] transition-all duration-300 rounded-full"
                style={{ width: `${value}%` }}
            />
        </div>
    </div>
);

const TaskCard = ({ title, desc, icon: Icon, active, onClick }: { title: string, desc: string, icon: any, active: boolean, onClick: () => void }) => (
    <div
        onClick={onClick}
        className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-300 ${active ? 'bg-[#142C3D]/40 border-[#00F2FF] shadow-[0_0_20px_rgba(0,242,255,0.1)]' : 'bg-[#0B111D]/60 border-white/10 hover:border-white/20'}`}
    >
        {active && <div className="absolute top-2 right-2 text-[#00F2FF]"><CheckCircle className="w-4 h-4 fill-cyan-900" /></div>}
        <div className={`p-2 rounded-lg w-fit mb-3 ${active ? 'bg-[#00F2FF] text-black' : 'bg-[#142C3D] text-white/60'}`}>
            <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-bold text-white mb-1">{title}</h3>
        <p className="text-[10px] text-white/40 leading-relaxed">{desc}</p>
    </div>
);

const FileItem = ({ name, size, type, status }: { name: string, size: string, type: string, status: 'SYNCED' | 'PROCESSING' }) => (
    <div className="flex items-center justify-between p-3 bg-[#0B111D] border border-white/5 rounded-lg hover:border-[#00F2FF]/30 transition-colors group">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center bg-[#142C3D] ${type === 'audio' ? 'text-purple-400' : 'text-blue-400'}`}>
                {type === 'audio' ? <Mic className="w-4 h-4" /> : <Database className="w-4 h-4" />}
            </div>
            <div>
                <p className="text-xs text-white font-medium group-hover:text-[#00F2FF] transition-colors">{name}</p>
                <p className="text-[9px] text-white/40 uppercase font-mono">{size} • {type.toUpperCase()}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'SYNCED' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-[9px] text-white/30 font-mono tracking-wider">{status}</span>
        </div>
    </div>
);



// --- MAIN PAGE ---

export default function CreateAgentPage() {
    const router = useRouter();
    const store = useSynthesisStore();
    const { token } = useAuthStore();

    // Neural Map Store for Modal
    const { isKnowledgeModalOpen, openKnowledgeModal, closeKnowledgeModal } = useNeuralMapStore();

    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [activeTask, setActiveTask] = useState<'meeting' | 'interview'>('interview');
    const [activeTab, setActiveTab] = useState<'memory' | 'knowledge'>('knowledge');

    useEffect(() => {
        store.setCoreMode('stasis');
        store.setCameraState('overview');
    }, []);

    const handleSynthesize = async () => {
        setIsSynthesizing(true);
        store.setCoreMode('synthesizing');

        try {
            // STEP 1: Create Agent
            const agentProfile = {
                name: "Neural Agent v1",
                personality_config: {
                    confidence: store.confidence,
                    empathy: store.empathy,
                    technical: store.technical,
                }
            };

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

            const agentResponse = await fetch(`${API_URL}/agents/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(agentProfile),
            });

            if (!agentResponse.ok) {
                throw new Error("Failed to create agent core.");
            }

            const agentData = await agentResponse.json();
            const agentId = agentData.id;
            console.log("Agent Created:", agentId);

            // STEP 2: Upload Voice (if exists)
            // Parallelize animation wait with uploads
            await Promise.all([
                // Minimum animation time (4s)
                new Promise(resolve => setTimeout(resolve, 4000)),

                (async () => {
                    if (store.voiceFile && token) {
                        console.log("Uploading Voice...");
                        await store.uploadVoiceSample(agentId, token);
                    }
                })(),

                (async () => {
                    if (token) {
                        console.log("Uploading Knowledge Base...");
                        await useNeuralMapStore.getState().uploadPendingNodes(agentId, token);
                    }
                })()
            ]);

            store.setCoreMode('complete');

            // Short delay to show "Complete" state
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);

        } catch (error) {
            console.error(error);
            setIsSynthesizing(false);
            store.setCoreMode('stasis');
            alert("Synthesis Failed: " + (error instanceof Error ? error.message : "Unknown Error"));
        }
    };

    // Helper for handle file upload
    const handleVoiceDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            store.setVoiceFile(e.target.files[0]);
            store.setCoreMode('listening');
        }
    };

    return (
        <div className="relative w-full h-screen bg-[#020408] overflow-hidden text-white selection:bg-cyan-500/30">

            {/* MAIN CONTENT WRAPPER - ANIMATES ON MODAL OPEN */}
            <motion.div
                className="relative w-full h-full z-10 flex flex-col"
                animate={isKnowledgeModalOpen
                    ? { scale: 0.97, opacity: 0.6, filter: 'blur(6px)' }
                    : { scale: 1, opacity: 1, filter: 'blur(0px)' }
                }
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* Navbar */}
                <Header />

                {/* 3D Scene Layer */}
                <div className="absolute inset-0 z-0 top-[60px]">
                    <Canvas camera={{ position: [0, 0, 9], fov: 40 }}>
                        <ambientLight intensity={1.5} />
                        <pointLight position={[10, 10, 10]} intensity={2} color="#00F2FF" />
                        <pointLight position={[-10, 0, 5]} intensity={1.5} color="#7000FF" />
                        <SynthesisCore />
                        <ParticleCloud count={100} />
                        {/* 3D Labels */}
                        <Html position={[-1, -2.5, 0]}>
                            <div className="backdrop-blur-md bg-black/40 border border-white/10 px-4 py-3 rounded-lg w-40">
                                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Sentiment</p>
                                <p className="text-sm text-white font-bold tracking-wide">Neutral-Positive</p>
                            </div>
                        </Html>
                    </Canvas>
                </div>

                {/* MAIN UI GRID */}
                <div className="relative z-10 w-full h-full pt-[100px] px-8 pb-8 flex justify-between pointer-events-none">

                    {/* LEFT COLUMN - Enabled Pointer Events */}
                    <div className="w-[380px] flex flex-col h-full gap-4 overflow-y-auto scrollbar-hide pointer-events-auto">

                        {/* 1. Identity */}
                        <div className="bg-[#05080a]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                            <SectionTitle icon={Upload} title="Neural Voice Identity" />
                            <div className="relative">
                                <label
                                    className="block h-32 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-[#00F2FF]/50 hover:bg-[#00F2FF]/5 transition-all cursor-pointer group"
                                >
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={handleVoiceDrop}
                                    />

                                    {store.voiceUploaded ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 rounded-full bg-[#00F2FF]/20 flex items-center justify-center mb-2"><CheckCircle className="w-5 h-5 text-[#00F2FF]" /></div>
                                            <p className="text-xs text-[#00F2FF] font-mono tracking-wider">WAVEFORM SYNCED</p>
                                            <p className="text-[9px] text-white/40 mt-1">{store.voiceFile?.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-2 rounded bg-white/5 group-hover:bg-[#00F2FF]/20 transition-colors"><FileText className="w-5 h-5 text-white/40 group-hover:text-[#00F2FF]" /></div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-white mb-0.5">Upload Waveform Sample</p>
                                                <p className="text-[9px] text-white/30">Drag & drop .wav or .mp3 to clone voice</p>
                                            </div>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* 2. Personality */}
                        <div className="bg-[#05080a]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 pt-5">
                            <SectionTitle icon={Cpu} title="Personality Matrix" />
                            <div className="space-y-6">
                                <CustomSlider label="Confidence Level" value={store.confidence} onChange={store.setConfidence} />
                                <CustomSlider label="Empathy Factor" value={store.empathy} onChange={store.setEmpathy} />
                                <CustomSlider label="Technical Depth" value={store.technical} onChange={store.setTechnical} />
                            </div>
                        </div>

                        {/* 3. Task Specialization */}
                        <div className="bg-[#05080a]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 pt-5 flex-1">
                            <SectionTitle icon={Settings} title="Task Specialization" />
                            <div className="grid grid-cols-2 gap-3">
                                <TaskCard
                                    active={activeTask === 'meeting'}
                                    onClick={() => setActiveTask('meeting')}
                                    title="Meeting Auto"
                                    desc="Autonomous scheduling & summaries with RAG."
                                    icon={User}
                                />
                                <TaskCard
                                    active={activeTask === 'interview'}
                                    onClick={() => setActiveTask('interview')}
                                    title="Tech Interview"
                                    desc="Code review and algorithm scoring."
                                    icon={Cpu}
                                />
                            </div>
                        </div>

                        {/* INITIATE BUTTON */}
                        <button
                            onClick={handleSynthesize}
                            disabled={isSynthesizing}
                            className={`
                                w-full py-4 rounded-xl font-bold text-sm tracking-[0.2em] uppercase transition-all duration-500
                                ${isSynthesizing
                                    ? 'bg-cyan-500/20 text-cyan-500 border border-cyan-500/50 cursor-wait'
                                    : 'bg-[#00F2FF] hover:bg-[#00dbe6] text-black shadow-[0_0_30px_rgba(0,242,255,0.4)] hover:shadow-[0_0_50px_rgba(0,242,255,0.6)]'}
                                flex items-center justify-center gap-3
                            `}
                        >
                            {isSynthesizing ? (
                                'INITIALIZING NEURAL LINK...'
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 fill-black" /> Initiate Synthesis
                                </>
                            )}
                        </button>
                    </div>

                    {/* RIGHT COLUMN - Enabled Pointer Events */}
                    <div className="w-[380px] h-full flex flex-col gap-4 pointer-events-auto">

                        {/* TABS */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('memory')}
                                className={`flex-1 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'memory' ? 'bg-[#00F2FF]/10 border-[#00F2FF] text-[#00F2FF]' : 'bg-black/40 border-white/10 text-white/40 hover:text-white'}`}
                            >
                                Context Memory
                            </button>
                            <button
                                onClick={() => {
                                    if (activeTab === 'knowledge') {
                                        openKnowledgeModal();
                                    } else {
                                        setActiveTab('knowledge');
                                    }
                                }}
                                className={`flex-1 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'knowledge' ? 'bg-[#00F2FF]/10 border-[#00F2FF] text-[#00F2FF]' : 'bg-black/40 border-white/10 text-white/40 hover:text-white'}`}
                            >
                                Knowledge Base
                            </button>
                        </div>

                        {/* KNOWLEDGE BASE TRIGGER BUTTON (When In Knowledge Tab) */}
                        {activeTab === 'knowledge' && (
                            <div
                                onClick={openKnowledgeModal}
                                className="group p-4 rounded-xl bg-[#00F2FF]/5 border border-[#00F2FF]/30 hover:bg-[#00F2FF]/10 hover:border-[#00F2FF] transition-all cursor-pointer backdrop-blur-md flex items-center justify-between"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Database className="w-4 h-4 text-[#00F2FF]" />
                                        <span className="text-xs font-bold text-white group-hover:text-[#00F2FF] transition-colors">OPEN KNOWLEDGE CORTEX</span>
                                    </div>
                                    <p className="text-[10px] text-white/40 font-mono">Manage RAG nodes & vectors</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-[#00F2FF]/10 flex items-center justify-center group-hover:bg-[#00F2FF] group-hover:text-black transition-all">
                                    <Settings className="w-4 h-4" />
                                </div>
                            </div>
                        )}

                        {/* PANEL CONTENT */}
                        <div className="flex-1 bg-[#05080a]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ingested Nodes</h3>
                                <span className="text-[10px] text-white/40 font-mono">2 / 5 SLOTS</span>
                            </div>

                            <div className="space-y-3">
                                <FileItem name="Resume_v2.pdf" size="1.2 MB" type="pdf" status="SYNCED" />
                            </div>

                            {/* Placeholder */}
                            <div className="mt-4 p-8 border border-dashed border-white/5 rounded-xl text-center">
                                <p className="text-[10px] text-white/20 uppercase tracking-widest">Awaiting Context Streams...</p>
                            </div>
                        </div>

                        {/* STATUS LOGS */}
                        <div className="bg-[#05080a]/80 border-t border-white/5 p-4 rounded-xl flex justify-between text-[9px] text-white/30 font-mono uppercase">
                            <span>Latency: 12ms</span>
                            <span>Buffer: 99.8%</span>
                            <span>Secure_Enclave: Active</span>
                        </div>
                    </div>

                </div>
            </motion.div>

            {/* KNOWLEDGE MODAL - PRESENCE */}
            <AnimatePresence>
                {isKnowledgeModalOpen && (
                    <KnowledgeBaseModal onClose={closeKnowledgeModal} />
                )}
            </AnimatePresence>

            {/* SYNTHESIS LOADER */}
            <AnimatePresence>
                {isSynthesizing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl"
                    >
                        <div className="relative w-64 h-64 mb-12">
                            <span className="absolute inset-0 border-t-2 border-[#00F2FF] rounded-full animate-spin" />
                            <span className="absolute inset-4 border-r-2 border-[#7000FF] rounded-full animate-spin-reverse" />
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <h2 className="text-2xl font-bold text-white tracking-[0.2em] mb-2">BUILDING</h2>
                                <p className="text-xs text-[#00F2FF] font-mono">88%</p>
                            </div>
                        </div>
                        <div className="w-[400px] font-mono text-xs space-y-2 opacity-60">
                            <p className="text-[#00F2FF]">> Initiating secure handshake...</p>
                            <p className="text-white/60">> Allocating GPU clusters...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
