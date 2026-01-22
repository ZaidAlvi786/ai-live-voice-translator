import { motion } from 'framer-motion';
import { X, Volume2, Monitor, Shield, Cpu } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const { user } = useAuthStore();
    const [volume, setVolume] = useState(80);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-lg bg-[#05080a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                            <Cpu className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">System Configuration</h2>
                            <p className="text-[10px] text-white/40 font-mono">GLOBAL NODE SETTINGS</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-4 h-4 text-white/60" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* User Info */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-900 to-cyan-700 flex items-center justify-center font-bold text-white shadow-lg">
                            {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'OP'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{user?.full_name || 'Operative'}</p>
                            <p className="text-xs text-white/40 font-mono">{user?.email || 'OFFLINE'}</p>
                        </div>
                        <div className="ml-auto px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400 font-mono uppercase">
                            Active
                        </div>
                    </div>

                    {/* Audio Settings */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Volume2 className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-wide">Audio Output</span>
                        </div>
                        <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                            <div className="flex justify-between text-xs text-white/60 mb-2">
                                <span>Master Volume</span>
                                <span>{volume}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="100"
                                value={volume}
                                onChange={(e) => setVolume(Number(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
                            />
                        </div>
                    </div>

                    {/* Display Settings */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Monitor className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-wide">Interface</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 font-bold text-left">
                                High Contrast
                            </button>
                            <button className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 font-bold text-left hover:bg-white/10 transition-colors">
                                Reduced Motion
                            </button>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-red-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-wide">Security</span>
                        </div>
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex justify-between items-center">
                            <span className="text-xs text-red-200">2FA Verification</span>
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">REQUIRED</span>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-white/60 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-colors">
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
