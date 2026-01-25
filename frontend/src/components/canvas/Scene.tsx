'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { LayoutCamera } from './LayoutCamera';
import { NeuralCore } from './NeuralCore';
import { Environment, Stars } from '@react-three/drei';
import { useSpatialStore } from '@/stores/useSpatialStore';
import { MeetingsWorld } from './MeetingsWorld';

export default function Scene() {
    const mode = useSpatialStore((state) => state.mode);

    return (
        <div className="fixed inset-0 z-0 bg-neural-900 pointer-events-none">
            <Canvas>
                 {/* Shared Logic */}
                <Suspense fallback={null}>
                    <LayoutCamera />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />

                    {/* Default Scene Content (Always visible or conditional) */}
                    {(mode === 'ENTRY' || mode === 'DASHBOARD') && <NeuralCore />}

                    {/* Route-Specific Worlds */}
                    {mode === 'MEETINGS' && <MeetingsWorld />}

                    {/* Background Atmosphere */}
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                    <Environment preset="city" />
                </Suspense>
            </Canvas>
        </div>
    );
}
