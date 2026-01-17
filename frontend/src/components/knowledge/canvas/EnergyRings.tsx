import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useNeuralMapStore } from '@/stores/useNeuralMapStore';

export function EnergyRings() {
    const { ingestionState } = useNeuralMapStore();
    const groupRef = useRef<THREE.Group>(null!);

    // We manage a list of active rings to animate them
    const [rings, setRings] = useState<{ id: number, scale: number, opacity: number }[]>([]);

    useEffect(() => {
        if (ingestionState === 'synced') {
            // Spawn a new ring
            const id = Date.now();
            setRings(prev => [...prev, { id, scale: 1, opacity: 1 }]);
        }
    }, [ingestionState]);

    useFrame((state, delta) => {
        if (rings.length === 0) return;

        setRings(prev => prev.map(ring => ({
            ...ring,
            scale: ring.scale + delta * 5, // Expand speed
            opacity: ring.opacity - delta * 0.8 // Fade speed
        })).filter(ring => ring.opacity > 0)); // Remove invisible rings
    });

    return (
        <group ref={groupRef}>
            {rings.map(ring => (
                <mesh key={ring.id} rotation={[Math.PI / 2, 0, 0]} scale={[ring.scale, ring.scale, ring.scale]}>
                    <ringGeometry args={[0.9, 1, 64]} />
                    <meshBasicMaterial
                        color="#00F2FF"
                        transparent
                        opacity={ring.opacity}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            ))}
        </group>
    );
}
