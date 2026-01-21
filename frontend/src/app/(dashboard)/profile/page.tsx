'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { motion } from 'framer-motion';
import { User, Shield, Lock, Save, Loader2 } from 'lucide-react';

export default function ProfilePage() {
    const { user, updateProfile, updatePassword } = useAuthStore();

    // Form States
    const [name, setName] = useState(user?.name || user?.full_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // UI States
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingProfile(true);
        setMessage(null);
        try {
            await updateProfile({ full_name: name, email });
            setMessage({ type: 'success', text: 'Profile updated successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setLoadingProfile(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingPassword(true);
        setMessage(null);
        try {
            await updatePassword(currentPassword, newPassword);
            setMessage({ type: 'success', text: 'Password updated successfully' });
            setCurrentPassword('');
            setNewPassword('');
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update password' });
        } finally {
            setLoadingPassword(false);
        }
    };

    return (
        <div className="w-full h-full p-6 space-y-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-widest text-cyan-400 font-sans">
                    OPERATIVE <span className="text-white">PROFILE</span>
                </h1>
                <p className="text-xs text-cyan-600/60 font-mono tracking-widest mt-2">
                    MANAGE IDENTITY AND CREDENTIALS
                </p>
            </header>

            {/* Notification Area */}
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 border rounded font-mono text-xs tracking-wider ${message.type === 'success'
                            ? 'bg-green-900/20 border-green-500/30 text-green-400'
                            : 'bg-red-900/20 border-red-500/30 text-red-400'
                        }`}
                >
                    {message.text}
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Information Panel */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-1 rounded-xl bg-gradient-to-b from-cyan-500/20 to-transparent"
                >
                    <div className="bg-[#05080a] p-6 rounded-lg h-full border border-cyan-900/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <User className="w-24 h-24 text-cyan-500" />
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="w-5 h-5 text-cyan-400" />
                            <h2 className="text-lg font-bold text-white tracking-wider">IDENTITY</h2>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-4 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-cyan-700 font-bold">Operative Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/50 border border-cyan-900/30 text-cyan-100 text-sm px-4 py-3 rounded focus:border-cyan-500/50 focus:bg-cyan-900/10 transition-all outline-none font-sans"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-cyan-700 font-bold">Comms Link (Email)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-cyan-900/30 text-cyan-100 text-sm px-4 py-3 rounded focus:border-cyan-500/50 focus:bg-cyan-900/10 transition-all outline-none font-sans"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loadingProfile}
                                    className="w-full bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 text-xs font-bold py-3 px-4 rounded tracking-widest flex items-center justify-center gap-2 transition-all group-hover:shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                                >
                                    {loadingProfile ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            UPDATE IDENTITY
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>

                {/* Security Panel */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-1 rounded-xl bg-gradient-to-b from-red-500/20 to-transparent"
                >
                    <div className="bg-[#05080a] p-6 rounded-lg h-full border border-red-900/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Lock className="w-24 h-24 text-red-500" />
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <Lock className="w-5 h-5 text-red-400" />
                            <h2 className="text-lg font-bold text-white tracking-wider">SECURITY CLEARANCE</h2>
                        </div>

                        <form onSubmit={handlePasswordUpdate} className="space-y-4 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-red-700 font-bold">Current Passcode</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-red-900/30 text-red-100 text-sm px-4 py-3 rounded focus:border-red-500/50 focus:bg-red-900/10 transition-all outline-none font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-red-700 font-bold">New Passcode</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-red-900/30 text-red-100 text-sm px-4 py-3 rounded focus:border-red-500/50 focus:bg-red-900/10 transition-all outline-none font-mono"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loadingPassword}
                                    className="w-full bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 text-xs font-bold py-3 px-4 rounded tracking-widest flex items-center justify-center gap-2 transition-all group-hover:shadow-[0_0_15px_rgba(255,0,0,0.1)]"
                                >
                                    {loadingPassword ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Shield className="w-4 h-4" />
                                            UPDATE CREDENTIALS
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
