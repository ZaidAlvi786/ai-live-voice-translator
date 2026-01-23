"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Key, Settings, Save, Loader2, Bell, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiRequest } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';

interface UserSettings {
    theme: string;
    notifications_enabled: boolean;
    api_keys: { [key: string]: string };
}


const TabButton = ({ active, label, icon: Icon, onClick }: any) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
            ${active
                ? 'bg-blue-600/10 text-blue-600 border-blue-600/50 dark:bg-[#00F2FF]/10 dark:text-[#00F2FF] dark:border-[#00F2FF]/50 shadow-sm dark:shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 dark:text-white/40 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'}
        `}
    >
        <Icon size={14} />
        {label}
    </button>
);

export default function SettingsPage() {
    const { user, updateProfile } = useAuthStore();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'profile' | 'keys' | 'preferences'>('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    // Settings State
    const [settings, setSettings] = useState<UserSettings>({
        theme: 'dark',
        notifications_enabled: true,
        api_keys: {}
    });

    // Keys State (local input)
    const [openaiKey, setOpenaiKey] = useState('');
    const [elevenlabsKey, setElevenlabsKey] = useState('');

    // Fetch Settings
    useEffect(() => {
        if (user) {
            setName(user.name || user.full_name || '');
            setEmail(user.email || '');
            fetchSettings();
        }
    }, [user]);

    const fetchSettings = async () => {
        try {
            const data = await apiRequest<UserSettings>('/users/settings');
            setSettings(data);
            if (data.api_keys) {
                setOpenaiKey(data.api_keys.openai || '');
                setElevenlabsKey(data.api_keys.elevenlabs || '');
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            // Update Auth Profile (Supabase metadata)
            // Note: Current auth store updateProfile might call different endpoint
            // For now, assuming auth store handles it or we call specific endpoint.
            // Using store method for consistency with auth state.
            await updateProfile({ full_name: name });
            setMessage({ type: 'success', text: 'Identity updated successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update identity' });
        } finally {
            setLoading(false);
        }
    };

    const handleSettingsUpdate = async (partialSettings: Partial<UserSettings>) => {
        setLoading(true);
        setMessage(null);
        try {
            const updated = await apiRequest<UserSettings>('/users/settings', 'PATCH', partialSettings);
            setSettings(updated); // Update local state with response
            setMessage({ type: 'success', text: 'System preferences updated' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update preferences' });
        } finally {
            setLoading(false);
        }
    };

    const saveKeys = async () => {
        const keys = {
            openai: openaiKey,
            elevenlabs: elevenlabsKey
        };
        await handleSettingsUpdate({ api_keys: keys });
    };

    return (
        <div className="w-full h-full min-h-screen bg-gray-50 dark:bg-[#020408] text-slate-900 dark:text-white p-8 overflow-y-auto transition-colors duration-300">
            {/* Header */}
            <div className="flex justify-between items-end mb-12 border-b border-slate-200 dark:border-white/5 pb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2">My Profile & Settings</h1>
                    <p className="text-white/40 font-mono text-sm">Manage Identity, Secrets & System Config</p>
                </div>
            </div>

            {/* Notification */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`mb-6 p-4 rounded border text-xs font-mono tracking-wider ${message.type === 'success'
                            ? 'bg-green-900/20 border-green-500/30 text-green-400'
                            : 'bg-red-900/20 border-red-500/30 text-red-400'
                            }`}
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-white/5 pb-1">
                <TabButton active={activeTab === 'profile'} label="Identity" icon={User} onClick={() => setActiveTab('profile')} />
                <TabButton active={activeTab === 'keys'} label="API Secrets" icon={Key} onClick={() => setActiveTab('keys')} />
                <TabButton active={activeTab === 'preferences'} label="System Prefs" icon={Settings} onClick={() => setActiveTab('preferences')} />
            </div>

            <div className="max-w-4xl">
                <AnimatePresence mode='wait'>

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                            className="bg-white dark:bg-[#05080a] border border-slate-200 dark:border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-sm dark:shadow-none"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <User size={120} />
                            </div>

                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Shield className="text-[#00F2FF]" size={20} />
                                Operative Identity
                            </h3>

                            <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-md relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-[#00F2FF] font-bold">Display Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#0B111D] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 rounded-lg focus:border-blue-500 dark:focus:border-[#00F2FF] outline-none transition-colors"
                                    />
                                </div>
                                <div className="space-y-2 opacity-50 pointer-events-none">
                                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Comms Link (read-only)</label>
                                    <input
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="w-full bg-[#0B111D] border border-white/5 text-white/50 text-sm px-4 py-3 rounded-lg"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-[#00F2FF]/10 border border-[#00F2FF]/50 text-[#00F2FF] hover:bg-[#00F2FF] hover:text-black font-bold uppercase tracking-widest text-xs rounded-lg transition-all flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                    Update Identity
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* API KEYS TAB */}
                    {activeTab === 'keys' && (
                        <motion.div
                            key="keys"
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                            className="bg-white dark:bg-[#05080a] border border-slate-200 dark:border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-sm dark:shadow-none"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Key size={120} />
                            </div>

                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Key className="text-blue-600 dark:text-[#00F2FF]" size={20} />
                                External API Secrets
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-white/40 mb-8 max-w-lg">
                                Securely store your API keys. These are encrypted at rest and only used for your specific agent instantiations.
                            </p>

                            <div className="space-y-6 max-w-lg relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/60 font-bold">OpenAI API Key</label>
                                    <input
                                        type="password"
                                        value={openaiKey}
                                        onChange={(e) => setOpenaiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full bg-slate-50 dark:bg-[#0B111D] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm px-4 py-3 rounded-lg focus:border-blue-500 dark:focus:border-[#00F2FF] outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/60 font-bold">ElevenLabs API Key</label>
                                    <input
                                        type="password"
                                        value={elevenlabsKey}
                                        onChange={(e) => setElevenlabsKey(e.target.value)}
                                        placeholder="..."
                                        className="w-full bg-slate-50 dark:bg-[#0B111D] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm px-4 py-3 rounded-lg focus:border-blue-500 dark:focus:border-[#00F2FF] outline-none"
                                    />
                                </div>

                                <button
                                    onClick={saveKeys}
                                    disabled={loading}
                                    className="px-8 py-3 bg-[#00F2FF] text-black font-bold uppercase tracking-widest text-xs rounded-lg transition-all hover:bg-[#00dbe6] flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                    Save Secrets
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* PREFERENCES TAB */}
                    {activeTab === 'preferences' && (
                        <motion.div
                            key="preferences"
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                            className="bg-white dark:bg-[#05080a] border border-slate-200 dark:border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-sm dark:shadow-none"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Settings size={120} />
                            </div>

                            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                                <Settings className="text-blue-600 dark:text-[#00F2FF]" size={20} />
                                System Configuration
                            </h3>

                            <div className="space-y-4 max-w-lg relative z-10">

                                {/* Notifications Toggle */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white dark:bg-black rounded-lg text-blue-600 dark:text-[#00F2FF] border border-slate-200 dark:border-transparent">
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">System Notifications</h4>
                                            <p className="text-xs text-slate-500 dark:text-white/40">Receive updates on agent status</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={settings.notifications_enabled}
                                        onChange={(v) => handleSettingsUpdate({ notifications_enabled: v })}
                                    />
                                </div>


                                {/* Theme Toggle */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white dark:bg-black rounded-lg text-blue-600 dark:text-[#00F2FF] border border-slate-200 dark:border-transparent">
                                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">Interface Theme</h4>
                                            <p className="text-xs text-slate-500 dark:text-white/40">{theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={theme === 'dark'}
                                        onChange={toggleTheme}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}

// Simple Toggle Component
const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-blue-600 dark:bg-[#00F2FF]' : 'bg-slate-200 dark:bg-white/10'}`}
    >
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);
