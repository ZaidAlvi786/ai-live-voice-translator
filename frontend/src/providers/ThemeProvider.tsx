'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiRequest } from '@/lib/api';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    const { user } = useAuthStore();

    // Load initial theme
    useEffect(() => {
        const stored = localStorage.getItem('theme') as Theme;
        if (stored) {
            setTheme(stored);
            document.documentElement.classList.toggle('dark', stored === 'dark');
        } else {
            // Default to dark
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    // Sync with User Settings if logged in
    useEffect(() => {
        if (user) {
            // We could fetch specifically, or assume store/user object has it if we expanded user object.
            // For now, let's just respect local override until we fetch settings fully.
            // Ideally, we fetch settings on mount in layout.
        }
    }, [user]);

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Persist if logged in
        if (user) {
            try {
                await apiRequest('/users/settings', 'PATCH', { theme: newTheme });
            } catch (e) {
                console.error("Failed to save theme preference", e);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
