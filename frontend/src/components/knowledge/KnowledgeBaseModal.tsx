'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Search, X, Mic, FileText, Database, Globe, Maximize2, Minus, Plus, Upload, Lock, RefreshCw, Radio } from 'lucide-react';
import { useNeuralMapStore, KnowledgeNode } from '@/stores/useNeuralMapStore';
import { NeuralScene } from './canvas/NeuralScene';
import { ParticleCloud } from '../canvas/ParticleCloud';
import { useRef } from 'react';

const IconMap = {
    pdf: FileText,
    audio: Mic,
    web: Globe,
    text: FileText,
    code: Database
};

// 2D List Item Component
const KnowledgeListItem = ({ node }: { node: KnowledgeNode }) => {
    const { activeNodeId, focusedNodeId, setActiveNode, focusNode } = useNeuralMapStore();
    const isActive = activeNodeId === node.id;
    const isFocused = focusedNodeId === node.id;
    const Icon = IconMap[node.type as keyof typeof IconMap] || FileText;

    const isProcessing = node.status === 'processing';

    return (
        <div
            className={`
                group relative p-3 rounded-lg border transition-all duration-300 cursor-pointer mb-2
                ${isActive || isFocused
                    ? 'bg-[#142C3D]/80 border-[#00F2FF] shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                    : 'bg-[#0B111D]/60 border-white/5 hover:border-white/10'}
            `}
            onMouseEnter={() => setActiveNode(node.id)}
            onMouseLeave={() => setActiveNode(null)}
            onClick={() => focusNode(node.id)}
        >
            <div className="flex items-center gap-3">
                <div className={`
                    p-2 rounded-md flex items-center justify-center transition-colors
                    ${isActive || isFocused ? 'bg-[#00F2FF] text-black' : 'bg-[#1e293b]/50 text-white/40 border border-white/5'}
                `}>
                    <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <h3 className={`text-xs font-bold truncate transition-colors ${isActive || isFocused ? 'text-[#00F2FF]' : 'text-white/80'}`}>
                            {node.label}
                        </h3>
                        {/* Status Check */}
                        {node.status === 'synced' && <span className="text-[9px] text-[#00F2FF] font-mono tracking-wider ml-2 flex items-center gap-1"><CheckIcon /> SYNCED</span>}
                        {node.status === 'processing' && <span className="text-[9px] text-yellow-500 font-mono tracking-wider ml-2 flex items-center gap-1 animate-pulse"><Radio className="w-3 h-3" /> PROCESSING</span>}
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white/30 uppercase font-mono">{node.size}</span>
                        <span className="text-[9px] text-white/20">Updated: 2 HR AGO</span>
                    </div>

                    {/* Progress Bar for Processing */}
                    {isProcessing && (
                        <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 w-3/4 animate-pulse" />
                        </div>
                    )}
                </div>
            </div>

            {/* Hover Glint */}
            {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none" />}
        </div>
    );
};

// Simple Check Icon
const CheckIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

export function KnowledgeBaseModal({ onClose }: { onClose: () => void }) {
    const { nodes, ingestNode, ingestionState, ingestionProgress } = useNeuralMapStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            ingestNode(e.target.files[0]);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, filter: 'blur(20px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-6 z-50 bg-[#020408]/95 backdrop-blur-[40px] border border-white/10 rounded-2xl overflow-hidden flex shadow-2xl"
        >
            {/* Background Mesh/Grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />

            {/* LEFT SIDEBAR - CONTROL PANEL */}
            <div className="w-[480px] border-r border-white/5 bg-[#05080a]/80 flex flex-col relative z-20">
                {/* Header */}
                <div className="p-6 pb-4">
                    <h1 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Knowledge Base Management</h1>

                    {/* Search & Ingest Row */}
                    <div className="flex gap-3 mb-6">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00F2FF]/50 group-hover:text-[#00F2FF] transition-colors" />
                            <input
                                type="text"
                                placeholder="SEARCH FILES..."
                                className="w-full bg-[#0B111D] border border-[#00F2FF]/20 rounded-lg pl-9 pr-4 py-2.5 text-[10px] font-bold text-white placeholder-white/20 focus:outline-none focus:border-[#00F2FF] focus:shadow-[0_0_15px_rgba(0,242,255,0.2)] transition-all uppercase tracking-wider font-mono"
                            />
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 bg-[#00F2FF]/10 border border-[#00F2FF] hover:bg-[#00F2FF] hover:text-black text-[#00F2FF] text-[10px] font-bold rounded-lg flex items-center gap-2 transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(0,242,255,0.1)] hover:shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                        >
                            <Upload className="w-4 h-4" /> Ingest File
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    </div>

                    {/* Drag Drop / Status Area */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative h-32 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-[#00F2FF]/50 hover:bg-[#00F2FF]/5 transition-all cursor-pointer group"
                    >
                        {ingestionState === 'idle' && (
                            <>
                                <Upload className="w-6 h-6 text-white/20 mb-2 group-hover:text-[#00F2FF] transition-colors" />
                                <p className="text-[10px] text-white/40 group-hover:text-white uppercase tracking-widest transition-colors">Drag & drop context files here</p>
                                <p className="text-[9px] text-white/20 font-mono mt-1">(PDF, TXT, DOCX)</p>
                            </>
                        )}
                        {ingestionState === 'uploading' && (
                            <>
                                <div className="text-[#00F2FF] font-bold text-xs tracking-widest mb-2 animate-pulse">UPLOADING...</div>
                                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-[#00F2FF]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${ingestionProgress}%` }}
                                    />
                                </div>
                            </>
                        )}
                        {ingestionState === 'processing' && (
                            <div className="flex flex-col items-center gap-2">
                                <RefreshCw className="w-6 h-6 text-[#7000FF] animate-spin" />
                                <p className="text-[10px] text-[#7000FF] font-mono tracking-widest">NEURAL LINK PROCESSING...</p>
                            </div>
                        )}
                        {ingestionState === 'synced' && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-2 bg-green-500/20 rounded-full"><CheckIcon /></div>
                                <p className="text-[10px] text-green-400 font-mono tracking-widest">INGESTION COMPLETE</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                    <h2 className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-3 sticky top-0 bg-[#05080a] py-2 z-10">
                        Ingested Knowledge Nodes
                    </h2>
                    <div className="space-y-0">
                        {nodes.map(node => (
                            <KnowledgeListItem key={node.id} node={node} />
                        ))}
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="p-4 border-t border-white/5 bg-[#020408]">
                    <div className="flex justify-between text-[9px] text-white/30 font-mono mb-2">
                        <span>STORAGE USAGE: 65% (325 GB / 500 GB)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#142C3D] rounded-full overflow-hidden mb-3">
                        <div className="w-[65%] h-full bg-gradient-to-r from-cyan-600 to-[#00F2FF] shadow-[0_0_10px_rgba(0,242,255,0.4)]" />
                    </div>
                    <div className="flex justify-end gap-4 text-[9px] font-mono text-[#00F2FF]">
                        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> ENCRYPTION STATUS: AES-256 ENCRYPTED & SECURE</span>
                    </div>
                </div>
            </div>

            {/* RIGHT - 3D CANVAS */}
            <div className="flex-1 relative bg-black">

                {/* 3D Viewport Frame */}
                <div className="absolute inset-4 border border-[#00F2FF]/20 rounded-xl overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] z-0">
                    <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
                        <NeuralScene />
                        <ParticleCloud count={80} />
                    </Canvas>
                </div>

                {/* Overlays inside the viewport */}
                <div className="absolute top-8 left-8 z-10">
                    <div className="text-[10px] text-[#00F2FF] font-bold bg-[#00F2FF]/10 border border-[#00F2FF]/30 px-3 py-1 rounded uppercase tracking-wider backdrop-blur-md">
                        Neural Connection Map
                    </div>
                </div>

                <div className="absolute top-8 right-8 z-10 text-right space-y-1">
                    <p className="text-[9px] text-[#00F2FF] font-mono tracking-wider">VECTOR_DB_STATUS: ONLINE</p>
                    <p className="text-[9px] text-white/30 font-mono tracking-wider">NODES_INDEXED: {nodes.length + 1400}</p>
                </div>

                {/* Close Button specific */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-50 p-2 text-white/40 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-8 right-8 z-10 flex gap-2">
                    {[Plus, Minus, Maximize2].map((Icon, i) => (
                        <button key={i} className="p-2 bg-black/60 border border-white/10 rounded hover:border-[#00F2FF] text-white/60 hover:text-[#00F2FF] transition-all">
                            <Icon className="w-4 h-4" />
                        </button>
                    ))}
                </div>

                <div className="absolute bottom-8 left-8 z-10 flex gap-4 text-[9px] font-mono text-white/40">
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_#22c55e]" /> AUTO-SYNC: ON</span>
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_5px_#3b82f6]" /> ENCRYPTION: AES-256</span>
                </div>
            </div>
        </motion.div>
    );
}
