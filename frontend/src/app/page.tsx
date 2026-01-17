'use client';

import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { NeuralCore } from '@/components/canvas/NeuralCore';
import { NeuralAuth } from '@/components/auth/NeuralAuth';
import { useSpatialStore } from '@/stores/useSpatialStore';

export default function Home() {
    const { mode, setMode } = useSpatialStore();

    useEffect(() => {
        // Force AUTH mode on mount (since this IS the auth page now)
        setMode('AUTH');
    }, [setMode]);

    return (
        <main className="relative w-screen h-screen overflow-hidden bg-black text-white">
            {/* 3D Background Layer */}
            <div className="absolute inset-0 z-0">
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 75 }}
                    gl={{ antialias: true, alpha: true }}
                >
                    <Suspense fallback={null}>
                        <NeuralCore />
                        <ambientLight intensity={0.5} />
                    </Suspense>
                </Canvas>
            </div>

            {/* UI Layer */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
                {/* 
                    We show NeuralAuth if we are in AUTH mode.
                    If we transition to DASHBOARD, we might switch components here 
                    or handle routing. For now, let's keep it simple.
                 */}
                {mode === 'AUTH' && <NeuralAuth />}

                {mode === 'DASHBOARD' && (
                    <div className="animate-fade-in text-center">
                        <h1 className="text-4xl font-bold tracking-widest text-cyan-400">
                            ACCESS GRANTED
                        </h1>
                        <p className="mt-4 text-sm text-white/60">
                            Establishing Neural Link...
                        </p>
                    </div>
                )}
            </div>

            {/* Overlay Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-black/20 to-black/80 z-20" />
        </main>
    );
}
