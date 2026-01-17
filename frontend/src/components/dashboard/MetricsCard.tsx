'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export function ReadinessCard() {
    return (
        <div className="bg-[#0a0f14]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 h-[200px] flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Readiness Score</p>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-bold text-white">98.4</span>
                        <span className="text-sm text-cyan-400">%</span>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950/50 flex items-center justify-center text-cyan-400">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
            </div>

            {/* Bars */}
            <div className="flex items-end gap-2 h-16 mt-4">
                {[40, 60, 45, 75, 65, 85, 100].map((h, i) => (
                    <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                        className={`flex-1 rounded-sm ${i === 6 ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : 'bg-cyan-900/40'}`}
                    />
                ))}
            </div>
        </div>
    );
}

export function LatencyCard() {
    return (
        <div className="bg-[#0a0f14]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 h-[200px] flex justify-between items-center relative overflow-hidden group hover:border-white/10 transition-colors">
            <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Sync Latency (ms)</p>
                <p className="text-4xl font-bold text-white mt-2">12.0</p>
                <p className="text-xs text-cyan-400 mt-1">Optimal Performance</p>
            </div>

            {/* Radial Graph */}
            <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#1e293b" strokeWidth="6" />
                    <motion.circle
                        cx="48" cy="48" r="40"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="6"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 0.85 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </svg>
                <span className="absolute text-xs font-bold text-white">85%</span>
            </div>
        </div>
    );
}
