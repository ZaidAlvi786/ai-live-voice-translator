'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useSynthesisStore } from '@/stores/useSynthesisStore';
import { easing } from 'maath';

export function SynthesisCore() {
    const wireframeRef = useRef<THREE.Mesh>(null!);
    const coreRef = useRef<THREE.Mesh>(null!);
    const glowRef = useRef<THREE.Mesh>(null!);

    const { coreMode } = useSynthesisStore();

    useFrame((state, delta) => {
        // Rotation
        if (wireframeRef.current) {
            wireframeRef.current.rotation.y += delta * 0.1;
            wireframeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1 + 0.2; // Tilted slightly
        }
        if (coreRef.current) {
            coreRef.current.rotation.y -= delta * 0.2;
        }

        // Breathing / Pulse
        const t = state.clock.elapsedTime;
        const pulse = 1 + Math.sin(t * 2) * 0.05;

        if (wireframeRef.current) wireframeRef.current.scale.setScalar(pulse);
        if (glowRef.current) {
            glowRef.current.scale.setScalar(pulse * 1.2);
            // Animate opacity based on mode
            const targetOpacity = coreMode === 'listening' ? 0.8 : 0.4;
            easing.damp(glowRef.current.material, 'opacity', targetOpacity, 0.2, delta);
        }
    });

    return (
        <group rotation={[0.2, 0, 0]}> {/* Slight visual tilt */}
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>

                {/* 1. Main Wireframe Disc (Flattened Sphere) */}
                <mesh ref={wireframeRef}>
                    <sphereGeometry args={[2.5, 32, 16]} /> {/* Horizontal, low poly for tech look */}
                    <meshBasicMaterial
                        color="#00F2FF"
                        wireframe
                        transparent
                        opacity={0.15}
                    />
                </mesh>

                {/* 2. Inner Tech Lattice (Denser) */}
                <mesh ref={coreRef} scale={[0.8, 0.4, 0.8]}>
                    <sphereGeometry args={[2, 24, 24]} />
                    <meshBasicMaterial
                        color="#2563eb" // Blue-600
                        wireframe
                        transparent
                        opacity={0.3}
                    />
                </mesh>

                {/* 3. Central Gradient Core (Solid Glassy) */}
                <mesh scale={[2.4, 0.6, 2.4]}>
                    <sphereGeometry args={[1, 64, 64]} />
                    <meshPhysicalMaterial
                        color="#0891b2" // Cyan-600 Base
                        emissive="#2563eb" // Blue-600 Glow
                        emissiveIntensity={0.5}
                        transparent
                        opacity={0.8}
                        roughness={0.1}
                        metalness={0.1}
                        transmission={0.5} // Glass-like
                        thickness={1}
                    />
                </mesh>

                {/* 4. Outer Glow Halo (Billboarding Fade) */}
                <mesh ref={glowRef} scale={[3, 0.8, 3]}>
                    <sphereGeometry args={[1, 32, 32]} />
                    <meshBasicMaterial
                        color="#00F2FF"
                        transparent
                        opacity={0.1}
                        side={THREE.BackSide}
                        depthWrite={false}
                    />
                </mesh>

            </Float>

            {/* Orbital Rings - Refined for "Saucer" look */}
            <group rotation={[Math.PI / 2, 0, 0]}> {/* Flat rings */}
                {/* Cyan Ring */}
                <mesh>
                    <torusGeometry args={[3.8, 0.01, 16, 100]} />
                    <meshBasicMaterial color="#00F2FF" transparent opacity={0.3} />
                </mesh>
                {/* Blue Ring */}
                <mesh scale={[0.8, 0.8, 0.8]}>
                    <torusGeometry args={[3.8, 0.02, 16, 100]} />
                    <meshBasicMaterial color="#2563eb" transparent opacity={0.2} />
                </mesh>
            </group>

            {/* Lights */}
            <pointLight position={[0, 5, 0]} intensity={2} color="#00F2FF" distance={10} />
            <pointLight position={[0, -5, 0]} intensity={2} color="#2563eb" distance={10} />
        </group>
    );
}
