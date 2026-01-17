'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ParticleCloud } from '@/components/canvas/ParticleCloud';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative w-screen h-screen bg-transparent text-white overflow-hidden font-sans">
            {/* 3D Background */}
            <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
                <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <ParticleCloud />
                </Canvas>
            </div>

            {/* Layout Shell */}
            <div className="relative z-10 flex h-full">
                <Sidebar />
                <div className="flex-1 flex flex-col pl-64">
                    <DashboardHeader />
                    <main className="flex-1 overflow-y-auto pt-20 p-8 scrollbar-hide">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
