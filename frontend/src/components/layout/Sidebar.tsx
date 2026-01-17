'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, MessageSquare, GraduationCap, Settings, Shield } from 'lucide-react';

const MENU_ITEMS = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Agents', icon: Users, href: '/agents' },
    { name: 'Meetings', icon: MessageSquare, href: '/meetings' },
    { name: 'Training', icon: GraduationCap, href: '/training' },
    { name: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname.startsWith(path);

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-obsidian-surface backdrop-blur-xl border-r border-white/5 z-40 flex flex-col shadow-neural">
            {/* Brand */}
            <div className="p-8 pb-12">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-neural rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.3)]">
                        <Shield className="w-5 h-5 text-black fill-black/20" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold tracking-wider">Neuralis</h1>
                        <p className="text-[10px] text-cyan-neural/60 uppercase tracking-[0.2em] font-mono">
                            Command Center
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2">
                {MENU_ITEMS.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative block"
                        >
                            {active && (
                                <motion.div
                                    layoutId="active-nav-pill"
                                    className="absolute inset-0 bg-[#142C3D] border-l-2 border-cyan-neural rounded-r-lg shadow-[inset_0_0_20px_rgba(0,242,255,0.1)]"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}

                            <div className={`relative flex items-center gap-4 px-4 py-3 transition-colors ${active ? 'text-cyan-neural' : 'text-slate-500 hover:text-slate-300'}`}>
                                <item.icon className="w-5 h-5" />
                                <span className="text-sm font-medium tracking-wide">{item.name}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer User */}
            <div className="p-6 border-t border-white/5">
                <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border border-white/10" />
                    <div>
                        <p className="text-xs text-white font-medium">Admin Alpha</p>
                        <p className="text-[9px] text-cyan-neural/80 uppercase">L-4 Clearance</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
