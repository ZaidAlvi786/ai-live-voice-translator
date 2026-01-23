import { useState, useEffect } from 'react';
import { Bell, ShieldCheck, Search, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { formatDistanceToNow } from 'date-fns';

export function DashboardHeader() {
    const { user } = useAuthStore();
    const { notifications, unreadCount, fetchNotifications, markAsRead } = useNotificationStore();
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        // Initial fetch
        if (user) fetchNotifications();

        // Poll every 30s
        const interval = setInterval(() => {
            if (user) fetchNotifications();
        }, 30000);

        return () => clearInterval(interval);
    }, [user]);

    // Get Initials
    const getInitials = () => {
        if (user?.full_name) {
            return user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        }
        if (user?.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return 'OP'; // Operative
    };

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
                <div className="flex items-center gap-4 border-l border-white/5 pl-6 relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative w-8 h-8 flex items-center justify-center bg-[#0a0f14] border border-white/5 rounded-lg transition-all ${showNotifications ? 'text-cyan-400 border-cyan-500/30' : 'text-slate-500 hover:text-cyan-400'}`}
                    >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-12 right-0 w-80 bg-[#0B111D] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
                            >
                                <div className="p-3 border-b border-white/5 flex justify-between items-center bg-[#05080a]">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Alerts</h4>
                                    <button onClick={() => setShowNotifications(false)} className="text-white/40 hover:text-white"><X size={12} /></button>
                                </div>
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-white/20 text-xs">No new alerts</div>
                                    ) : (
                                        notifications.map(note => (
                                            <div
                                                key={note.id}
                                                onClick={() => !note.read && markAsRead(note.id)}
                                                className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${note.read ? 'opacity-50' : 'bg-cyan-500/5'}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${note.type === 'error' ? 'bg-red-500/20 text-red-500' :
                                                            note.type === 'success' ? 'bg-green-500/20 text-green-500' :
                                                                'bg-blue-500/20 text-blue-500'
                                                        }`}>
                                                        {note.type}
                                                    </span>
                                                    <span className="text-[9px] text-white/30 font-mono">
                                                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <h5 className="text-xs font-bold text-white mb-1">{note.title}</h5>
                                                <p className="text-[10px] text-white/60 leading-relaxed">{note.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 pl-2">
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-bold text-white">{user?.full_name || 'Operative'}</p>
                            <p className="text-[9px] text-white/40 font-mono tracking-wider">{user?.email || 'OFFLINE'}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#142C3D] to-[#0B111D] border border-white/10 flex items-center justify-center text-xs font-bold text-white/70 shadow-lg">
                            {getInitials()}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
