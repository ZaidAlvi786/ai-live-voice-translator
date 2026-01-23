import { create } from 'zustand';

interface LoadingStore {
    isLoading: boolean;
    message: string;
    showLoading: (message?: string) => void;
    hideLoading: () => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
    isLoading: false, // Default to false
    message: 'INITIALIZING...',
    showLoading: (message = 'INITIALIZING DATA STREAM...') => set({ isLoading: true, message }),
    hideLoading: () => set({ isLoading: false }),
}));
