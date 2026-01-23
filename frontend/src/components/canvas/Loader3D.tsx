'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { Icosahedron, Sphere } from '@react-three/drei';

export function Loader3D() {
    const outerRef = useRef<Mesh>(null);
    const innerRef = useRef<Mesh>(null);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        if (outerRef.current) {
            // Rotate outer shell
            outerRef.current.rotation.x = t * 0.5;
            outerRef.current.rotation.y = t * 0.3;
            outerRef.current.rotation.z = t * 0.1;

            // Pulse scale
            const scale = 1 + Math.sin(t * 2) * 0.1;
            outerRef.current.scale.setScalar(scale);
        }

        if (innerRef.current) {
            // Counter rotate inner core
            innerRef.current.rotation.y = -t * 1;

            // Pulse glow intensity (simulated by scale or color)
            // For now, simpler scale pulse
            const innerScale = 0.5 + Math.sin(t * 3) * 0.1;
            innerRef.current.scale.setScalar(innerScale);
        }
    });

    return (
        <group>
            {/* Outer Wireframe Shell */}
            <Icosahedron ref={outerRef} args={[1, 0]}>
                <meshBasicMaterial
                    color="#00F2FF"
                    wireframe
                    transparent
                    opacity={0.3}
                />
            </Icosahedron>

            {/* Inner Glowing Core */}
            <Sphere ref={innerRef} args={[0.5, 32, 32]}>
                <meshBasicMaterial
                    color="#00F2FF"
                    transparent
                    opacity={0.8}
                />
            </Sphere>

            {/* Ambient Glow (simulated with larger transparent sphere or just point light in scene) */}
            <pointLight position={[0, 0, 0]} intensity={2} color="#00F2FF" distance={5} />
        </group>
    );
}
