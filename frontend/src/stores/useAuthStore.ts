import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;

    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    signIn: () => Promise<void>; // Placeholder for Supabase logic
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: true, // Start in loading state for "The Birth" check
    error: null,

    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),

    signIn: async () => {
        // TODO: Implement Supabase Auth
        console.log("Sign In Initiated");
    },

    signOut: async () => {
        set({ user: null, token: null });
    },
}));
