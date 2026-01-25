'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Trash2, Edit2, AlertOctagon } from 'lucide-react';
import { useEffect } from 'react';

type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    type?: ConfirmationType;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

const variants = {
    danger: {
        color: 'text-red-500',
        borderColor: 'border-red-500/50',
        bgGlow: 'bg-red-500/10',
        buttonBg: 'bg-red-500 hover:bg-red-600',
        icon: Trash2
    },
    warning: {
        color: 'text-yellow-400',
        borderColor: 'border-yellow-500/50',
        bgGlow: 'bg-yellow-500/10',
        buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
        icon: AlertTriangle
    },
    info: {
        color: 'text-[#00F2FF]',
        borderColor: 'border-[#00F2FF]/50',
        bgGlow: 'bg-[#00F2FF]/10',
        buttonBg: 'bg-[#00F2FF] hover:bg-[#00c2cc]',
        icon: Edit2
    },
    success: {
        color: 'text-green-500',
        borderColor: 'border-green-500/50',
        bgGlow: 'bg-green-500/10',
        buttonBg: 'bg-green-500 hover:bg-green-600',
        icon: CheckCircle
    }
};

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    type = 'danger',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false
}: ConfirmationModalProps) {
    
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    const style = variants[type];
    const Icon = style.icon;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className={`relative w-full max-w-md bg-[#050505] border ${style.borderColor} rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Glow Effect */}
                        <div className={`absolute top-0 left-0 w-full h-1 ${style.buttonBg} shadow-[0_0_20px_currentColor]`} />

                        <div className="p-8">
                            <div className="flex items-start gap-6">
                                {/* Icon container */}
                                <div className={`p-4 rounded-xl ${style.bgGlow} border ${style.borderColor} shrink-0`}>
                                    <Icon className={`w-8 h-8 ${style.color}`} />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">{description}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-8 flex items-center justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-white/40 hover:text-white text-sm font-medium transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={`px-6 py-2.5 rounded-lg text-black font-bold uppercase tracking-wide text-xs transition-all shadow-lg hover:shadow-[0_0_15px_currentColor] disabled:opacity-50 disabled:cursor-not-allowed ${style.buttonBg}`}
                                >
                                    {isLoading ? 'Processing...' : confirmText}
                                </button>
                            </div>
                        </div>

                        {/* Decor */}
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                           <AlertOctagon size={120} className={style.color} />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
