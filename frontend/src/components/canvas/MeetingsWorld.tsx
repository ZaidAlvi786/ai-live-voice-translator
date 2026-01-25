'use client';

import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Float, Text, useCursor } from '@react-three/drei';
import { motion as motion3d } from 'framer-motion-3d';
import { useMeetingStore } from '@/stores/useMeetingStore';
import { ContextOrb } from '@/components/3d/ContextOrb';

// Enhanced Meeting Slab Component
const EnhancedMeetingSlab = ({ meeting, position, onClick }: any) => {
    const [hovered, setHovered] = useState(false);
    useCursor(hovered);

    return (
        <group position={position}>
            <motion3d.group
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                animate={{
                    scale: hovered ? 1.1 : 1,
                    z: hovered ? 1 : 0
                }}
            >
                <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
                    <mesh rotation={[0, 0, 0]}>
                        <boxGeometry args={[2.5, 3.5, 0.1]} />
                        <meshPhysicalMaterial
                            color={meeting.status === 'live' ? "#1a0505" : "#05101a"}
                            emissive={meeting.status === 'live' ? "#ff0000" : "#00F2FF"}
                            emissiveIntensity={hovered ? 0.4 : 0.1}
                            transmission={0.6}
                            thickness={1}
                            roughness={0.2}
                            metalness={0.8}
                            clearcoat={1}
                        />
                    </mesh>

                    {/* Holographic Text */}
                    <group position={[-1, 1.4, 0.1]}>
                        <Text fontSize={0.15} color="white" anchorX="left" maxWidth={2}>
                            {meeting.title || "SESSION"}
                        </Text>
                        <Text position={[0, -0.25, 0]} fontSize={0.1} color={meeting.status === 'live' ? 'red' : 'cyan'} anchorX="left">
                            {meeting.status.toUpperCase()}
                        </Text>
                    </group>
                </Float>
            </motion3d.group>
        </group>
    );
};

export function MeetingsWorld() {
    const { meetings, activeMeetingId, setActiveMeeting } = useMeetingStore();

    // Calculate Slab Positions on a Temporal Arc
    const slabPositions = useMemo(() => {
        return meetings.map((m, i) => {
            const offset = i - (meetings.length / 2);
            const x = offset * 3;
            const z = Math.abs(offset) * 1.5; // Parabola
            return new THREE.Vector3(x, 0, -z);
        });
    }, [meetings]);

    return (
        <group position={[0, 0, 0]}>
            {/* Central Neural Orb */}
            <group position={[0, 2, -5]}>
                <ContextOrb mode={
                    activeMeetingId ? 'analysis' :
                        (meetings.some(m => m.status === 'live') ? 'live' : 'idle')
                } />
            </group>

            {/* Meetings Temporal Arc */}
            <group position={[0, -1, 0]}>
                {meetings.map((meeting, i) => (
                    <EnhancedMeetingSlab
                        key={meeting.id}
                        meeting={meeting}
                        position={slabPositions[i]}
                        onClick={(e: any) => {
                             e.stopPropagation();
                             setActiveMeeting(meeting.id);
                        }}
                    />
                ))}
            </group>

            {/* Grid */}
            <gridHelper args={[50, 50, '#111', '#050505']} position={[0, -3, 0]} />
        </group>
    );
}
