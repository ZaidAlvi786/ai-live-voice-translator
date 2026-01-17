'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { useSpatialStore } from '@/stores/useSpatialStore';
import { Vector3 } from 'three';
import { useRef } from 'react';

export function LayoutCamera() {
    const { camera } = useThree();
    const { cameraTarget, mode } = useSpatialStore();

    // Smoothly interpolate camera position to target
    useFrame((state, delta) => {
        const targetVec = new Vector3(...cameraTarget);

        // Simple lerp for now, can be replaced with framer-motion-3d or spring physics later
        camera.position.lerp(targetVec, delta * 2);
        camera.lookAt(0, 0, 0); // Always look at the Neural Core for now
    });

    return null;
}
