'use client';

import { useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { Fingerprint, Zap } from 'lucide-react';
import { useSpatialStore } from '@/stores/useSpatialStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

export function NeuralAuth() {
    const { setMode } = useSpatialStore();
    const router = useRouter();
    const { setToken, setUser } = useAuthStore();
    const [isHovering, setIsHovering] = useState(false);
    const [neuralId, setNeuralId] = useState('');
    const [passcode, setPasscode] = useState('');
    const [loading, setLoading] = useState(false);

    // Mouse Tracking for 3D Tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 40, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 40, damping: 20 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;
        x.set(mouseXVal / width - 0.5);
        y.set(mouseYVal / height - 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0); y.set(0); setIsHovering(false);
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!neuralId || !passcode) {
            console.error("Credentials missing");
            return;
        }
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8000/api/v1/auth/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ neural_id: neuralId, passcode }),
            });

            if (!res.ok) throw new Error('CONNECTION FAILED');

            const data = await res.json();
            console.log("Connection Established:", data);

            // Save to store
            setToken(data.token);
            setUser({
                id: data.user_id,
                email: neuralId,
                full_name: 'Operative',
                avatar_url: null,
                created_at: new Date().toISOString()
            });

            setTimeout(() => {
                setMode('DASHBOARD');
                router.push('/dashboard');
            }, 1000);

        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    return (
        <div
            className="perspective-1000 flex items-center justify-center w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: loading ? 1.1 : 1, opacity: loading ? 0 : 1 }}
                transition={{ duration: 0.8 }}
                className="relative w-[400px] bg-obsidian-surface backdrop-blur-xl border border-white/5 rounded-lg p-8 shadow-neural group"
            >
                {/* Floating Animation */}
                <motion.div
                    animate={loading ? {} : { y: [0, -5, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="flex flex-col items-center"
                >
                    {/* Scanner Icon */}
                    <div className="relative mb-8">
                        {/* Static rings */}
                        <div className="w-20 h-20 rounded-full border border-cyan-900/40 absolute inset-0" />
                        <div className="w-16 h-16 rounded-full border border-cyan-800/40 absolute inset-2" />

                        {/* Dynamic rings */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: loading ? 2 : 8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-[-4px] rounded-full border border-transparent border-t-cyan-neural/60"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: loading ? 3 : 12, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-[4px] rounded-full border border-transparent border-b-cyan-neural/40"
                        />

                        {/* Core */}
                        <div className="relative w-20 h-20 bg-black/40 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.1)]">
                            <div className={`w-1 h-1 rounded-full shadow-[0_0_10px_cyan] ${loading ? 'bg-white' : 'bg-cyan-neural'}`} />
                            <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
                                transition={{ duration: loading ? 0.5 : 2, repeat: Infinity }}
                                className="absolute inset-0 bg-cyan-neural/10 rounded-full"
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold tracking-[0.2em] text-cyan-50 text-center mb-1 font-sans">
                        NEURALIS <span className="text-cyan-neural">AUTH</span>
                    </h2>
                    <p className="text-[9px] text-cyan-600/60 uppercase tracking-[0.3em] mb-10 font-mono">
                        {loading ? "ESTABLISHING UPLINK..." : "Biometric Synchronization Active"}
                    </p>

                    {/* Form Container */}
                    <form onSubmit={handleConnect} className="w-full space-y-5 mb-8">
                        <div className="space-y-1">
                            <label className="text-[9px] text-cyan-700 font-bold uppercase tracking-widest ml-1">
                                Neural ID
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-cyan-neural/10 rounded opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                                <input
                                    type="text"
                                    value={neuralId}
                                    onChange={(e) => setNeuralId(e.target.value)}
                                    placeholder="ID - XXXXXXXX"
                                    className="relative w-full bg-[#05080a] border border-[#1a232e] text-cyan-100 text-xs px-4 py-3 rounded focus:outline-none focus:border-cyan-neural/50 focus:bg-[#0a0f14] transition-all placeholder:text-cyan-900/50 font-mono tracking-wider"
                                />
                                <Fingerprint className="absolute right-3 top-3 w-4 h-4 text-cyan-900" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] text-cyan-700 font-bold uppercase tracking-widest ml-1">
                                Passcode Sequence
                            </label>
                            <input
                                type="password"
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                placeholder="• • • • • • • •"
                                className="w-full bg-[#05080a] border border-[#1a232e] text-cyan-100 text-xs px-4 py-3 rounded focus:outline-none focus:border-cyan-neural/50 focus:bg-[#0a0f14] transition-all placeholder:text-cyan-900/50 font-mono tracking-widest"
                            />
                        </div>

                        {/* Checkbox row */}
                        <div className="flex items-center justify-between w-full pt-2">
                            <div className="flex items-center gap-2 cursor-pointer group">
                                <div className="w-3 h-3 bg-[#05080a] border border-cyan-900/50 rounded-sm group-hover:border-cyan-neural/50 transition-colors" />
                                <span className="text-[8px] text-cyan-800 uppercase tracking-wider group-hover:text-cyan-600 transition-colors">Keep Link Active</span>
                            </div>
                            <span className="text-[8px] text-cyan-800 uppercase tracking-wider cursor-pointer hover:text-cyan-600 transition-colors">Reset Sequence</span>
                        </div>

                        {/* Button */}
                        <motion.button
                            type="submit"
                            onHoverStart={() => setIsHovering(true)}
                            onHoverEnd={() => setIsHovering(false)}
                            disabled={loading}
                            whileHover={{ scale: 1.02, textShadow: "0 0 8px rgb(0,242,255)" }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full relative py-3 mt-4 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:shadow-[0_0_30px_rgba(0,242,255,0.5)] transition-shadow overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <div className="relative flex items-center justify-center gap-2 text-black font-bold text-xs tracking-[0.2em] font-sans">
                                {loading ? "INITIALIZING..." : "ESTABLISH CONNECTION"}
                                <Zap className="w-3 h-3 fill-black" />
                            </div>
                        </motion.button>
                    </form>


                    <div className="text-center text-[8px] text-cyan-900/40 mt-4 uppercase tracking-wider font-mono">
                        <span className="opacity-60">Unregistered Signal?</span>{' '}
                        <Link href="/signup" className="text-cyan-600 hover:text-cyan-400 font-bold transition-colors">
                            INITIALIZE IDENTITY
                        </Link>
                    </div>
                </motion.div>

                {/* Footer Status */}
                <div className="absolute bottom-3 left-4 text-[7px] text-cyan-900/40 font-mono tracking-wider">
                    ENCRYPTED: AES-4096-GCM
                </div>
                <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-[7px] text-cyan-900/40 font-mono tracking-wider">
                    <div className="w-1 h-1 bg-green-900 rounded-full animate-pulse" />
                    SERVER ONLINE
                </div>
            </motion.div>
        </div>
    );
}
