'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export function OverrideSwitch() {
    const [isOverride, setIsOverride] = useState(false);

    return (
        <div className="grid place-items-center">
            <label className="text-xs uppercase tracking-widest text-crimson-500 font-bold mb-4 animate-pulse">
                {isOverride ? 'MANUAL OVERRIDE ENGAGED' : 'AUTONOMOUS MODE ACTIVE'}
            </label>

            <div
                onClick={() => setIsOverride(!isOverride)}
                className={`
                w-24 h-44 rounded-full border-4 cursor-pointer relative transition-all duration-300
                ${isOverride ? 'border-crimson-500 bg-crimson-900/20 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : 'border-neural-500 bg-neural-900/50'}
            `}
            >
                <motion.div
                    layout
                    className={`
                    w-20 h-20 rounded-full absolute left-1 shadow-lg
                    ${isOverride ? 'bg-crimson-500 bottom-1' : 'bg-neural-500 top-1'}
                `}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                    {/* Inner Glow Details */}
                    <div className="absolute inset-2 rounded-full border border-white/30"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white/50 transform -rotate-90">
                            {isOverride ? 'STOP' : 'AUTO'}
                        </span>
                    </div>
                </motion.div>
            </div>

            <p className="text-xs text-white/30 mt-4 max-w-[200px] text-center">
                Slide down to engage manual control. This will interrupt the Neural Core immediately.
            </p>
        </div>
    );
}
