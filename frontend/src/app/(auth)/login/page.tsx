'use client';

import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { NeuralCore } from '@/components/canvas/NeuralCore';
import { NeuralAuth } from '@/components/auth/NeuralAuth';
import { useSpatialStore } from '@/stores/useSpatialStore';

export default function LoginPage() {
    const { setMode } = useSpatialStore();

    useEffect(() => {
        setMode('AUTH');
    }, [setMode]);

    return (
        <main className="relative w-screen h-screen overflow-hidden bg-[#050510] text-white">
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
                <NeuralAuth />
            </div>

            {/* Overlay Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-black/40 to-black/90 z-20 mix-blend-multiply" />
        </main>
    );
}
