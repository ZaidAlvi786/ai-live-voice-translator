'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleCloud } from '@/components/canvas/ParticleCloud';
import { motion } from 'framer-motion';

function CoreSphere() {
    const meshRef = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.y = t * 0.2;
        meshRef.current.position.y = Math.sin(t * 0.5) * 0.1;
    });

    return (
        <group>
            {/* Main Core Sphere */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[1.5, 64, 64]} />
                <meshStandardMaterial
                    color="#00aaff"
                    emissive="#0044aa"
                    emissiveIntensity={0.5}
                    roughness={0.1}
                    metalness={0.8}
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* Outer Glow Sphere */}
            <mesh scale={[1.2, 1.2, 1.2]}>
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshBasicMaterial
                    color="#00ffff"
                    transparent
                    opacity={0.1}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Orbiting Ring 1 */}
            <mesh rotation={[Math.PI / 3, 0, 0]}>
                <torusGeometry args={[2.2, 0.02, 16, 100]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
            </mesh>

            {/* Orbiting Ring 2 */}
            <mesh rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
                <torusGeometry args={[2.8, 0.01, 16, 100]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
            </mesh>
        </group>
    );
}

function StatsOverlay({ position, label, value, sublabel }: { position: [number, number, number], label: string, value: string, sublabel?: string }) {
    return (
        <Html position={position} center distanceFactor={15} zIndexRange={[100, 0]}>
            <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-2 w-28 transform transition-all duration-300 hover:scale-105 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold">{label}</p>
                </div>
                <p className="text-xs font-mono text-white font-semibold tracking-tight">{value}</p>
                {sublabel && <p className="text-[9px] text-slate-400 font-mono leading-tight">{sublabel}</p>}

                {/* Decorative corner lines */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/50 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500/50 rounded-bl-sm" />
            </div>
        </Html>
    );
}

export function DashboardCore() {
    return (
        <div className="relative w-full h-[500px] bg-[#05080a]/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden group">

            <div className="absolute inset-0 z-10">
                <Canvas camera={{ position: [0, 0, 9], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#0066ff" />

                    <Suspense fallback={null}>
                        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
                            <CoreSphere />
                        </Float>
                        <ParticleCloud count={1500} />

                        {/* REPOSITIONED: Left, Right, Highest Center to avoid bottom text overlap */}
                        <StatsOverlay position={[-3.8, 0.5, 0]} label="Memory" value="12GB" sublabel="Heap Allocation Stable" />
                        <StatsOverlay position={[4, 0.5, -.4]} label="CPU Load" value="34%" sublabel="Vector Processing Unit" />
                        <StatsOverlay position={[0, 2.8, -1.4]} label="Core Sync" value="Stable" sublabel="Latency: 12ms" />
                    </Suspense>
                </Canvas>
            </div>

            {/* Central Title Overlay - Moved slightly up to give more breathing room */}
            <div className="absolute inset-x-0 top-6 text-center z-20 pointer-events-none">
                <p className="text-[10px] uppercase tracking-[0.5em] text-cyan-500/40">Current Active Core</p>
            </div>

            {/* Bottom Status - Kept at bottom but ensure no 3D elements are behind it */}
            <div className="absolute inset-x-0 bottom-8 text-center z-20 pointer-events-none">
                <h2 className="text-3xl font-bold text-white tracking-wide drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                    Neuralis-Alpha <span className="text-cyan-400">Active</span>
                </h2>
                <div className="flex justify-center items-center gap-4 mt-6">
                    <div className="bg-black/60 border border-white/10 px-6 py-2 rounded-full backdrop-blur-md shadow-lg">
                        <span className="text-xs text-slate-400 uppercase tracking-wider mr-2">Stability</span>
                        <span className="text-lg font-mono text-cyan-400">99.9%</span>
                    </div>
                    <div className="bg-black/60 border border-white/10 px-6 py-2 rounded-full backdrop-blur-md shadow-lg">
                        <span className="text-xs text-slate-400 uppercase tracking-wider mr-2">Users</span>
                        <span className="text-lg font-mono text-white">1.2k</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
