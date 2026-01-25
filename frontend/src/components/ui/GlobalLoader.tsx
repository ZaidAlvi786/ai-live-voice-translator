'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLoadingStore } from '@/stores/useLoadingStore';

export function GlobalLoader() {
    const { isLoading, message } = useLoadingStore();

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[100] bg-[#020408] flex flex-col items-center justify-center pointer-events-auto"
                >
                    {/* Lightweight CSS Loader */}
                    <div className="relative w-32 h-32 flex items-center justify-center mb-12">
                         {/* Core */}
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="w-4 h-4 bg-[#00F2FF] rounded-full shadow-[0_0_20px_#00F2FF]"
                        />
                         {/* Rings */}
                        <motion.div 
                            animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                            className="absolute inset-0 border border-[#00F2FF]/50 rounded-full"
                        />
                         <motion.div 
                            animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
                            transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
                            className="absolute inset-0 border border-[#00F2FF]/30 rounded-full"
                        />
                    </div>

                    {/* Loading Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-center"
                    >
                        <h2 className="text-[#00F2FF] font-mono text-sm tracking-[0.3em] font-bold uppercase animate-pulse">
                            {message}
                        </h2>
                        <div className="mt-4 h-0.5 w-32 bg-gray-900 rounded-full mx-auto overflow-hidden">
                            <motion.div
                                className="h-full bg-[#00F2FF]"
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
