'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    title: string;
    action?: ReactNode;
}

export function GlassCard({ children, className = "", title, action }: GlassCardProps) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`bg-obsidian-surface backdrop-blur-xl border border-white/5 rounded-3xl p-8 flex flex-col shadow-neural ${className} group hover:shadow-cyan-500/10 hover:border-cyan-500/20 transition-all duration-300`}
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
                {action}
            </div>
            {children}
        </motion.div>
    );
}
