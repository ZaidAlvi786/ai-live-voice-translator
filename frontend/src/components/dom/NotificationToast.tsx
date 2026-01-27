'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

const IconMap = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle
};

const ColorMap = {
    info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    success: 'border-[#00F2FF]/50 bg-[#00F2FF]/10 text-[#00F2FF]',
    warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500',
    error: 'border-red-500/50 bg-red-500/10 text-red-500'
};

export const NotificationToast = () => {
    const { notifications, subscribe, fetchNotifications } = useNotificationStore();
    const { user } = useAuthStore();
    const [latestId, setLatestId] = useState<string | null>(null);

    // Subscribe to realtime updates
    useEffect(() => {
        if (!user) return;
        fetchNotifications();
        const cleanup = subscribe(user.id);
        return cleanup;
    }, [user]);

    // Show toast when new notification arrives
    useEffect(() => {
        if (notifications.length > 0) {
            const newest = notifications[0];
            if (newest.id !== latestId) {
                setLatestId(newest.id);
                // Auto dismiss id logic handled by local state or just showing latest for a few seconds
                // For simplicity, we just show the latest one if it's "fresh" (less than 5 seconds old)
                // But since we don't track freshness easily without time diff, we rely on ID change
            }
        }
    }, [notifications]);

    // Logic to hide after 5 seconds
    const [visible, setVisible] = useState(false);
    
    useEffect(() => {
        if (latestId) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [latestId]);

    if (!visible || !latestId || notifications.length === 0) return null;

    const note = notifications.find(n => n.id === latestId);
    if (!note) return null;

    const Icon = IconMap[note.type as keyof typeof IconMap] || Info;
    const colors = ColorMap[note.type as keyof typeof ColorMap] || ColorMap.info;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: 50 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 20, x: 20 }}
                    className="fixed bottom-8 right-8 z-[100]"
                >
                    <div className={`
                        w-80 p-4 rounded-xl border backdrop-blur-xl shadow-2xl
                        flex items-start gap-3 relative overflow-hidden
                        ${colors}
                        bg-[#05080a]/90
                    `}>
                        <div className="relative z-10 p-1 rounded-full bg-white/5">
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 relative z-10">
                            <h4 className="text-sm font-bold mb-1">{note.title}</h4>
                            <p className="text-xs opacity-80 leading-relaxed font-mono">{note.message}</p>
                        </div>
                        <button 
                            onClick={() => setVisible(false)}
                            className="relative z-10 p-1 hover:bg-white/10 rounded transition-colors"
                        >
                            <X className="w-4 h-4 opacity-50" />
                        </button>

                        {/* Background Glint */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
