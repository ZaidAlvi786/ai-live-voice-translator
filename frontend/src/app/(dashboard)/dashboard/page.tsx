'use client';

import { motion } from 'framer-motion';
import { DashboardCore } from '@/components/dashboard/DashboardCore';
import { ReadinessCard, LatencyCard } from '@/components/dashboard/MetricsCard';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Mic, Users, HardDrive } from 'lucide-react';

export default function DashboardPage() {
    return (
        <div className="flex flex-col gap-6 py-12">

            {/* Top Row: Core & Metrics */}
            <div className="grid grid-cols-12 gap-6">

                {/* Main Core - Spans 8 cols */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-12 lg:col-span-8"
                >
                    <DashboardCore />
                </motion.div>

                {/* Right Metrics - Spans 4 cols */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <ReadinessCard />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <LatencyCard />
                    </motion.div>
                </div>
            </div>

            {/* Bottom Row: Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">

                {/* Recent Meetings */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <GlassCard
                        title="Recent Meetings"
                        action={<span className="text-[10px] text-cyan-400 cursor-pointer uppercase font-bold hover:text-cyan-300">View All</span>}
                        className="h-full min-h-[300px]"
                    >
                        <div className="space-y-4">
                            {[
                                { title: "Sprint Planning Q4", meta: "Voice print match: 99.8%", time: "24m ago", status: "Synced", icon: Mic },
                                { title: "Client Sync: Aether Corp", meta: "Automation active", time: "2h ago", status: "Active", icon: Users },
                                { title: "Executive Board Briefing", meta: "Voice Auth Confirmed", time: "Yesterday", status: "Archived", icon: HardDrive },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors group cursor-pointer">
                                    <div className="w-10 h-10 rounded-lg bg-[#1a1f26] flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-950/30 transition-colors">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-slate-200">{item.title}</h4>
                                        <p className="text-[10px] text-slate-500">{item.meta}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 mb-1">{item.time}</p>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${item.status === 'Synced' ? 'border-green-800 text-green-400 bg-green-950/20' :
                                            item.status === 'Active' ? 'border-cyan-800 text-cyan-400 bg-cyan-950/20' :
                                                'border-slate-700 text-slate-500'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Training Progress */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <GlassCard
                        title="Training Progress"
                        action={<div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" /><span className="text-[9px] uppercase text-cyan-500 font-bold">Model Refining</span></div>}
                        className="h-full min-h-[300px]"
                    >
                        {/* Profile Section */}
                        <div className="bg-[#1a1f26]/50 rounded-2xl p-4 flex items-center gap-4 mb-6 border border-white/5 relative overflow-hidden">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center border-2 border-white/10 z-10">
                                <Mic className="w-5 h-5 text-white/80" />
                            </div>
                            <div className="flex-1 z-10">
                                <h4 className="text-sm font-bold text-white">Voice Profile: Alex Carter</h4>
                                <p className="text-[10px] text-slate-500">Linguistic Pattern Match</p>
                            </div>
                            <div className="z-10 text-right">
                                <span className="text-2xl font-bold text-white">92%</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-black">
                                <div className="h-full bg-cyan-500 w-[92%]" />
                            </div>
                        </div>

                        {/* Sub Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-[#1a1f26]/30 rounded-xl p-4 border border-white/5">
                                <p className="text-[9px] uppercase text-slate-500 mb-1">Emotion Accuracy</p>
                                <p className="text-xl font-bold text-white">88.5%</p>
                            </div>
                            <div className="bg-[#1a1f26]/30 rounded-xl p-4 border border-white/5">
                                <p className="text-[9px] uppercase text-slate-500 mb-1">Total Datasets</p>
                                <p className="text-xl font-bold text-white">14.2 GB</p>
                            </div>
                        </div>

                        <button className="w-full py-3 rounded-lg border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest hover:bg-cyan-500/10 transition-colors">
                            Accelerate Training
                        </button>
                    </GlassCard>
                </motion.div>

            </div>
        </div>
    );
}
