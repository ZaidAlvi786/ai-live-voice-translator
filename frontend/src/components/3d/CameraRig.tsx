import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ViewMode } from '@/stores/useMeetingStore';

interface CameraRigProps {
    viewMode: ViewMode;
    targetPosition?: THREE.Vector3; // For focusing on specific meeting slab
}

export function CameraRig({ viewMode, targetPosition }: CameraRigProps) {
    const vec = new THREE.Vector3();
    const lookAtVec = new THREE.Vector3();

    useFrame((state, delta) => {
        // 1. Determine Target Camera Position
        let targetCamPos = new THREE.Vector3(0, 2, 12); // Default 'timeline' / 'idle'
        let targetLookAt = new THREE.Vector3(0, 0, 0);

        if (viewMode === 'detail' && targetPosition) {
            // Focus on specific meeting
            // Offset slightly to the right to leave room for the modal text (if modal is left) or center
            // Let's assume modal overlays center, so we might want to zoom in but keep some context
            targetCamPos.set(targetPosition.x, targetPosition.y + 1, targetPosition.z + 6);
            targetLookAt.copy(targetPosition);
        } else if (viewMode === 'live') {
            // Close up on Orb
            targetCamPos.set(0, 0.5, 4);
            targetLookAt.set(0, 0, 0);
        }

        // 2. Smoothly Lerp Camera Position
        state.camera.position.lerp(targetCamPos, 0.05);

        // 3. Smoothly LookAt
        // We use a dummy vector to lerp the lookAt target
        // Current lookAt is hard to extract from quaternion without tracking, 
        // so we just lookAt every frame but lerp the *target* vector.
        // Simplified:
        state.camera.lookAt(targetLookAt); // Instant lookat for now, can be smoothed if needed

        // 4. Subtle Mouse Parallax (only in idle/timeline)
        if (viewMode === 'timeline') {
            state.camera.position.x += (state.pointer.x * 0.5 - state.camera.position.x) * 0.05;
            state.camera.position.y += (state.pointer.y * 0.5 - state.camera.position.y + 2) * 0.05;
        }
    });

    return null;
}
