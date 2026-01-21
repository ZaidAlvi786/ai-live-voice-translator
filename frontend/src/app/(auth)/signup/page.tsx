'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSpatialStore } from '@/stores/useSpatialStore';
import { GlassInput } from '@/components/dom/GlassInput';
import { GlassButton } from '@/components/dom/GlassButton';

export default function Signup() {
    const router = useRouter();
    const { setMode, setCameraTarget } = useSpatialStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        passkey: ''
    });

    useEffect(() => {
        setMode('AUTH');
        setCameraTarget([-2, 0, 4]); // Camera looks from LEFT side for signup
    }, [setMode, setCameraTarget]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // CRITICAL: Stop page reload
        setLoading(true);

        try {
            // Call the correct Register endpoint
            const res = await fetch('http://localhost:8000/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    neural_id: formData.email,
                    passcode: formData.passkey,
                    full_name: formData.name // Send the name!
                }),
            });

            if (!res.ok) throw new Error('Signup Failed');

            await res.json();

            // Success Transition
            setTimeout(() => {
                setMode('DASHBOARD');
                router.push('/dashboard');
            }, 1000);

        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-start w-full min-h-screen pl-[10vw]">
            <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="glass-card w-[400px] p-8"
            >
                <h2 className="text-3xl font-bold mb-2">Initialize</h2>
                <p className="text-white/60 text-sm mb-8">Create your Neural Identity</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <GlassInput
                        label="Full Designation"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                    />
                    <GlassInput
                        label="Neural ID"
                        name="email"
                        type="email"
                        placeholder="email@domain.com"
                        value={formData.email}
                        onChange={handleChange}
                    />
                    <GlassInput
                        label="Passkey"
                        name="passkey"
                        type="password"
                        placeholder="••••••••"
                        value={formData.passkey}
                        onChange={handleChange}
                    />

                    <div className="pt-4">
                        <GlassButton
                            type="submit"
                            variant="primary"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'Establishing Connection...' : 'Establish Connection'}
                        </GlassButton>
                    </div>

                    <div className="text-center text-xs text-white/40 mt-6">
                        Already verified? <Link href="/login" className="text-neural-500 hover:text-neural-300 underline">Access System</Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
