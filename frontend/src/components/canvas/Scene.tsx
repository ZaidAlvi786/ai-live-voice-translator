'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { LayoutCamera } from './LayoutCamera'; // We will create this
import { NeuralCore } from './NeuralCore'; // We will create this
import { Environment, Stars } from '@react-three/drei';

export default function Scene() {
    return (
        <div className="fixed inset-0 z-0 bg-neural-900">
            <Canvas>
                <Suspense fallback={null}>
                    <LayoutCamera />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />

                    {/* The Central Intelligence Metaphor */}
                    <NeuralCore />

                    {/* Background Atmosphere */}
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                    <Environment preset="city" />
                </Suspense>
            </Canvas>
        </div>
    );
}
