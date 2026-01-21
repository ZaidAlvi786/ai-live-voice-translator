'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, MessageSquare, GraduationCap, Settings, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

const MENU_ITEMS = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Agents', icon: Users, href: '/agents' },
    { name: 'Meetings', icon: MessageSquare, href: '/meetings' },
    { name: 'Training', icon: GraduationCap, href: '/training' },
    { name: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuthStore();

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
            <div className="p-4 border-t border-white/5 space-y-3">
                <Link href="/profile" className="block">
                    <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-pointer p-2 rounded-lg hover:bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border border-white/10 overflow-hidden flex items-center justify-center">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <Users className="w-4 h-4 text-white" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium truncate">{user?.full_name || 'Operative'}</p>
                            <p className="text-[9px] text-cyan-neural/80 uppercase">L-4 Clearance</p>
                        </div>
                    </div>
                </Link>

                <button
                    onClick={async () => {
                        await signOut();
                        router.push('/');
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all group"
                >
                    <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium tracking-wide">TERMINATE SESSION</span>
                </button>
            </div>
        </aside>
    );
}
