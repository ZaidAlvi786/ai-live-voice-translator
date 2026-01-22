import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    error: string | null;
    _hasHydrated: boolean;

    setUser: (user: User | null) => void;
    setTokens: (token: string | null, refreshToken: string | null) => void;
    setHasHydrated: (state: boolean) => void;
    signIn: () => Promise<void>; // Placeholder for Supabase logic
    signOut: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            refreshToken: null,
            isLoading: true, // Start in loading state for "The Birth" check
            error: null,
            _hasHydrated: false,

            setUser: (user) => set({ user }),
            setTokens: (token, refreshToken) => set({ token, refreshToken }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            signIn: async () => {
                // TODO: Implement Supabase Auth
                console.log("Sign In Initiated");
            },

            signOut: async () => {
                set({ user: null, token: null, refreshToken: null });
            },

            updateProfile: async (data: Partial<User>) => {
                try {
                    const response = await fetch('http://localhost:8000/api/v1/users/me', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            // Add Authorization header if we had real token validation
                        },
                        body: JSON.stringify(data),
                    });
                    if (!response.ok) throw new Error('Failed to update profile');

                    const result = await response.json();

                    // Update local state
                    set((state) => ({
                        user: state.user ? { ...state.user, ...data } : null
                    }));
                } catch (error) {
                    console.error("Update Profile Error", error);
                    throw error;
                }
            },

            updatePassword: async (currentPassword, newPassword) => {
                try {
                    const response = await fetch('http://localhost:8000/api/v1/users/me/password', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
                    });
                    if (!response.ok) throw new Error('Failed to update password');
                } catch (error) {
                    console.error("Update Password Error", error);
                    throw error;
                }
            },
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
