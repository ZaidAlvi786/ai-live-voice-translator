'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Plus, Users, Shield, Radio, Activity, Trash2, Database } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { GlassButton } from '@/components/dom/GlassButton';
import { ParticleCloud } from '@/components/canvas/ParticleCloud';
import { useAgentStore } from '@/stores/useAgentStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiRequest } from '@/lib/api';
import { Agent } from '@/types';

export default function AgentsPage() {
    const router = useRouter();
    const { agents, fetchAgents } = useAgentStore();
    const [knowledgeAgent, setKnowledgeAgent] = useState<Agent | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !knowledgeAgent) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = useAuthStore.getState().token;
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/agents/${knowledgeAgent.id}/knowledge`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            alert("Knowledge Ingested Successfully!");
            setKnowledgeAgent(null);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed");
        }
    };

    return (
        <div className="relative w-full min-h-full">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".txt"
                onChange={handleFileUpload}
            />

            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Neural Fleet</h1>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <p className="text-xs text-cyan-400 font-mono tracking-widest uppercase">
                            Active Nodes: {agents.length}
                        </p>
                    </div>
                </div>
                <GlassButton
                    variant="primary"
                    onClick={() => router.push('/create-agent')}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Synthesize New Agent
                </GlassButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                    <GlassCard
                        key={agent.id}
                        title={agent.name}
                        className="group hover:border-cyan-500/30 transition-all duration-300"
                        action={
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setKnowledgeAgent(agent);
                                        setTimeout(() => fileInputRef.current?.click(), 100);
                                    }}
                                    className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors"
                                    title="Upload Knowledge"
                                >
                                    <Database className="w-3 h-3" />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newStatus = agent.status === 'active' ? 'standby' : 'active';
                                        useAgentStore.getState().updateAgent(agent.id, { status: newStatus });
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border cursor-pointer hover:opacity-80 transition-opacity ${agent.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                                        }`}>
                                    {agent.status || 'STANDBY'}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Are you sure you want to decommission this Neural Unit?")) {
                                            useAgentStore.getState().deleteAgent(agent.id);
                                        }
                                    }}
                                    className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                                    title="Decommission Unit"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        }
                    >
                        <div className="mb-6 relative h-32 rounded-lg bg-black/40 overflow-hidden border border-white/5 group-hover:border-cyan-500/20 transition-colors">
                            <div className="absolute inset-0 opacity-50">
                                <Canvas camera={{ position: [0, 0, 5] }}>
                                    <ambientLight intensity={0.5} />
                                    <pointLight position={[10, 10, 10]} />
                                    <ParticleCloud count={200} />
                                </Canvas>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Users className="w-8 h-8 text-white/20 group-hover:text-cyan-400 transition-colors" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/40">Designation</span>
                                <span className="text-white font-medium">{agent.role || 'Unassigned Unit'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/40">Neural Link</span>
                                <span className="text-cyan-400 font-mono">{agent.latency || Math.floor(Math.random() * 20) + 5}ms</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                            <button
                                onClick={() => router.push(`/agents/${agent.id}/logs`)}
                                className="flex-1 py-2 rounded bg-white/5 hover:bg-white/10 text-xs text-white border border-white/5 transition-colors"
                            >
                                Neural Logs
                            </button>
                            <button
                                onClick={() => router.push(`/agents/${agent.id}/interface`)}
                                className="flex-1 py-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-xs text-cyan-400 border border-cyan-500/20 transition-colors"
                            >
                                Interface
                            </button>
                        </div>
                    </GlassCard>
                ))}

                {/* Create New Placeholder Card */}
                <div
                    onClick={() => router.push('/create-agent')}
                    className="border border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all cursor-pointer group h-[340px]"
                >
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                        <Plus className="w-8 h-8 text-white/20 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <p className="text-sm font-bold text-white/40 group-hover:text-cyan-400 transition-colors uppercase tracking-widest">
                        Initiate Synthesis
                    </p>
                </div>
            </div>
        </div>
    );
}
