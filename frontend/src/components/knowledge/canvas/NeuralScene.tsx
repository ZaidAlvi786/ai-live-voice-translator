import { useRef, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import { useNeuralMapStore } from '@/stores/useNeuralMapStore';
import { NeuralNode } from './NeuralNode';
import * as THREE from 'three';
import { easing } from 'maath';
import { Line } from '@react-three/drei';
import { OrbPulseMaterial } from './OrbPulseMaterial';
import { EnergyRings } from './EnergyRings';

// Register specific shader material
extend({ OrbPulseMaterial });


function CameraRig() {
    const { focusedNodeId, nodes } = useNeuralMapStore();
    const { camera } = useThree();

    useFrame((state, delta) => {
        if (focusedNodeId) {
            const targetNode = nodes.find(n => n.id === focusedNodeId);
            if (targetNode) {
                // Lerp camera to a cinematic offset position
                const targetPos = new THREE.Vector3(
                    targetNode.position[0], // Keep centered on X
                    targetNode.position[1], // Keep centered on Y
                    targetNode.position[2] + 8 // Back off to distance 8 (vs 4 originally)
                );

                easing.damp3(camera.position, targetPos, 0.5, delta);

                // Look at the node (smoothly)
                const targetLookAt = new THREE.Vector3(...targetNode.position);

                // Manual lerp for lookAt quaternion would be ideal, but for now simple lookAt
                state.camera.lookAt(targetLookAt);
            }
        } else {
            // Return to 'Overview' position
            easing.damp3(camera.position, [0, 0, 10], 0.8, delta);
            state.camera.lookAt(0, 0, 0);
        }
    });
    return null;
}

function Connections() {
    const { nodes, focusedNodeId, activeNodeId, ingestionState } = useNeuralMapStore();

    return (
        <group>
            {/* Connect all nodes to a central "Core" at [0,0,0] for visual structure */}
            {nodes.map(node => {
                const isActive = activeNodeId === node.id;
                const isFocused = focusedNodeId === node.id;
                const isProcessing = ingestionState === 'processing' && node.status === 'processing'; // Mock logic

                return (
                    <Line
                        key={node.id}
                        points={[[0, 0, 0], node.position]}
                        color={isProcessing ? '#7000FF' : (isActive || isFocused ? '#00F2FF' : '#1e293b')}
                        lineWidth={isActive || isFocused || isProcessing ? 2 : 1}
                        transparent
                        opacity={isActive || isFocused || isProcessing ? 0.8 : 0.2}
                        dashed={true}
                        dashScale={isActive || isProcessing ? 10 : 5}
                        dashSize={0.5}
                        gapSize={0.2}
                    />
                );
            })}
        </group>
    );
}

export function NeuralScene() {
    const { nodes, ingestionState } = useNeuralMapStore();
    const materialRef = useRef<any>(null);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uTime = state.clock.elapsedTime;
            // React to ingestion state
            materialRef.current.uPulseStrength = ingestionState === 'processing' ? 2.5 : 1.0;

            // Color shift?
            // materialRef.current.uColor = ...
        }
    });

    return (
        <group>
            <CameraRig />

            {/* Central Bio-Core */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[1, 64, 64]} />
                {/* @ts-ignore */}
                <orbPulseMaterial
                    ref={materialRef}
                    transparent
                    uColor={new THREE.Color('#00F2FF')}
                />
            </mesh>

            {/* Energy Propagation System */}
            <EnergyRings />

            <Connections />

            {nodes.map(node => (
                <NeuralNode key={node.id} node={node} />
            ))}

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#00F2FF" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7000FF" />
        </group>
    );
}
