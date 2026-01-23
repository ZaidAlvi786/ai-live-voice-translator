'use client';

import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader3D } from '@/components/canvas/Loader3D';
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
                    className="fixed inset-0 z-[100] bg-[#020408]/90 backdrop-blur-xl flex flex-col items-center justify-center"
                >
                    {/* 3D Scene Container */}
                    <div className="w-64 h-64 relative">
                        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                            <ambientLight intensity={0.5} />
                            <Loader3D />
                        </Canvas>
                    </div>

                    {/* Loading Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8 text-center"
                    >
                        <h2 className="text-[#00F2FF] font-mono text-sm tracking-[0.3em] font-bold uppercase animate-pulse">
                            {message}
                        </h2>
                        <div className="mt-2 h-1 w-24 bg-gray-800 rounded-full mx-auto overflow-hidden">
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
