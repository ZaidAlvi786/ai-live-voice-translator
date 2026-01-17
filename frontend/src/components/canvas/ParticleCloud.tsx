import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ParticleCloud = ({ count = 2000 }) => {
    const pointsRef = useRef<THREE.Points>(null!);

    // Generate random positions and velocities for each particle
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const time = Math.random() * 100;
            const factor = 20 + Math.random() * 100;
            const speed = 0.01 + Math.random() / 200;
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 10;
            temp.push({ time, factor, speed, x, y, z });
        }
        return temp;
    }, [count]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

        particles.forEach((particle, i) => {
            let { factor, speed, x, y, z } = particle;
            particle.time += speed; // Update time
            const t = particle.time;

            const px = x + Math.cos(t / 10) * factor * 0.02;
            const py = y + Math.sin(t / 10) * factor * 0.02;
            const pz = z + Math.sin(t / 10) * factor * 0.02;

            positions[i * 3] = px;
            positions[i * 3 + 1] = py;
            positions[i * 3 + 2] = pz;
        });

        pointsRef.current.geometry.attributes.position.needsUpdate = true;
        pointsRef.current.rotation.y += 0.001;
    });

    // Create the vertex data for the buffer geometry
    const [initialPositions, sizes] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const s = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 10;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
            s[i] = Math.random() * 2;
        }
        return [pos, s];
    }, [count]);

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={initialPositions.length / 3}
                    array={initialPositions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-size"
                    count={sizes.length}
                    array={sizes}
                    itemSize={1}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.03}
                color="#00F2FF"
                transparent
                opacity={0.3}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
};
