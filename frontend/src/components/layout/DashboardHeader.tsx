'use client';

import { Bell, ShieldCheck, Search } from 'lucide-react';

export function DashboardHeader() {
    return (
        <header className="fixed top-0 left-64 right-0 h-20 bg-[#05080a]/50 backdrop-blur-md border-b border-white/5 z-30 flex items-center justify-between px-8">
            {/* Left: Breadcrumbs / Status */}
            <div className="flex items-center gap-8">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Command Center</span>
                    <span className="text-sm text-slate-300 font-mono">/ Global Node 01</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/30 border border-cyan-900/50 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase">System Live</span>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-6">
                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-cyan-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search parameters..."
                        className="w-64 bg-[#0a0f14] border border-white/5 hover:border-white/10 focus:border-cyan-500/50 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-300 placeholder:text-slate-700 outline-none transition-all"
                    />
                </div>

                {/* Icons */}
                <div className="flex items-center gap-4 border-l border-white/5 pl-6">
                    <button className="relative w-8 h-8 flex items-center justify-center bg-[#0a0f14] border border-white/5 rounded-lg text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2 right-2.5 w-1 h-1 bg-red-500 rounded-full" />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center bg-[#0a0f14] border border-white/5 rounded-lg text-slate-500 hover:text-green-400 hover:border-green-500/30 transition-all">
                        <ShieldCheck className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>
    );
}
