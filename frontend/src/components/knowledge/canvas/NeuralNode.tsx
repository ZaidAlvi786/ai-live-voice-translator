import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { motion as motion3d } from 'framer-motion-3d';
import { useNeuralMapStore, NeuralNodeData } from '@/stores/useNeuralMapStore';
import { Zap, FileText, Mic, Globe, Database, Cpu, X, RefreshCw } from 'lucide-react';
import * as THREE from 'three';

const IconMap = {
    pdf: FileText,
    audio: Mic,
    web: Globe,
    text: FileText,
    code: Cpu
};

export function NeuralNode({ node }: { node: NeuralNodeData }) {
    const { activeNodeId, focusedNodeId, setActiveNode, focusNode, clearFocus } = useNeuralMapStore();
    const isActive = activeNodeId === node.id;
    const isFocused = focusedNodeId === node.id;
    const isDimmed = focusedNodeId && !isFocused;

    const Icon = IconMap[node.type as keyof typeof IconMap] || Database;

    // Variants for 3D Motion
    const variants = {
        idle: { scale: 1, color: '#334155' },
        hover: { scale: 1.4, color: '#00F2FF' },
        focused: { scale: 1.8, color: '#00F2FF', x: node.position[0], y: node.position[1], z: node.position[2] }, // Lock position
        dimmed: { scale: 0.8, color: '#1e293b' }
    };

    const currentState = isFocused ? 'focused' : (isActive ? 'hover' : (focusedNodeId ? 'dimmed' : 'idle'));

    return (
        <group>
            {/* The Physical Node */}
            <motion3d.mesh
                position={node.position}
                scale={variants[currentState].scale}
                onClick={(e) => { e.stopPropagation(); focusNode(node.id); }}
                onPointerOver={(e) => { e.stopPropagation(); setActiveNode(node.id); }}
                onPointerOut={(e) => { e.stopPropagation(); setActiveNode(null); }}
                animate={currentState}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
                <sphereGeometry args={[0.3, 32, 32]} />
                <motion3d.meshStandardMaterial
                    color={variants[currentState].color}
                    emissive={variants[currentState].color}
                    emissiveIntensity={isActive || isFocused ? 2 : 0.5}
                    toneMapped={false}
                    animate={{
                        color: variants[currentState].color,
                        emissive: variants[currentState].color
                    }}
                />
            </motion3d.mesh>

            {/* Orbiting Rings (Visual Flair) */}
            {(isActive || isFocused) && (
                <group position={node.position}>
                    <motion3d.mesh
                        rotation={[Math.PI / 2, 0, 0]}
                        animate={{ rotateZ: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    >
                        <torusGeometry args={[0.6, 0.02, 16, 100]} />
                        <meshBasicMaterial color="#00F2FF" transparent opacity={0.5} />
                    </motion3d.mesh>
                </group>
            )}

            {/* HOLOGRAPHIC INTELLIGENCE PANEL (Spatial Focus) */}
            {isFocused && (
                <Html position={[node.position[0] + 0.8, node.position[1] + 0.5, node.position[2]]} center distanceFactor={10} zIndexRange={[100, 0]}>
                    <div className="w-[320px] bg-[#020408]/90 backdrop-blur-xl border border-[#00F2FF]/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(0,242,255,0.2)] font-sans">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-[#00F2FF]/5">
                            <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-[#00F2FF]" />
                                <span className="text-xs font-bold text-white tracking-wider truncate max-w-[180px]">{node.label}</span>
                            </div>
                            <span className="text-[10px] font-mono text-[#00F2FF] bg-[#00F2FF]/10 px-2 py-0.5 rounded border border-[#00F2FF]/20">
                                {node.relevancy}%
                            </span>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            {/* Meta ID */}
                            <div className="flex justify-between text-[10px] text-white/40 font-mono uppercase">
                                <span>META_ID: #8821-X</span>
                                <span className="text-[#00F2FF]">HIGH RELEVANCE</span>
                            </div>

                            {/* Relevancy Bar */}
                            <div className="h-1 w-full bg-[#142C3D] rounded-full overflow-hidden">
                                <div className="h-full bg-[#00F2FF] shadow-[0_0_10px_#00F2FF]" style={{ width: `${node.relevancy}%` }} />
                            </div>

                            {/* Entities */}
                            <div>
                                <p className="text-[10px] font-bold text-white/60 mb-2 uppercase tracking-widest">Key Entities Identified</p>
                                <div className="flex flex-wrap gap-2">
                                    {node.entities.map((entity, i) => (
                                        <span key={i} className="px-2 py-1 rounded bg-[#142C3D] border border-white/5 text-[10px] text-white/80 hover:border-[#00F2FF]/50 transition-colors cursor-default">
                                            {entity}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Neural Summary */}
                            <div className="bg-[#05080a] border border-white/5 p-3 rounded text-[10px] text-white/60 leading-relaxed font-mono">
                                <span className="text-[#00F2FF] mr-1">✦ NEURAL SUMMARY</span>
                                <br />
                                Document outlines core specifications for the Titan Project neural interface. Critical dependency identified in memory allocation...
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); clearFocus(); }}
                                    className="flex-1 py-2 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="w-3 h-3" /> Disconnect
                                </button>
                                <button className="flex-1 py-2 rounded border border-[#00F2FF]/30 text-[#00F2FF] hover:bg-[#00F2FF]/10 text-xs font-bold transition-colors flex items-center justify-center gap-2">
                                    <RefreshCw className="w-3 h-3" /> Re-index
                                </button>
                            </div>
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}
