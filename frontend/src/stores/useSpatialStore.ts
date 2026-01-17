import { create } from 'zustand';

export type SceneMode = 'ENTRY' | 'AUTH' | 'SYNTHESIS' | 'DASHBOARD' | 'MISSION';

interface SpatialState {
    mode: SceneMode;
    cameraTarget: [number, number, number];
    isTransitioning: boolean;

    setMode: (mode: SceneMode) => void;
    setCameraTarget: (target: [number, number, number]) => void;
    startTransition: () => void;
    endTransition: () => void;
}

export const useSpatialStore = create<SpatialState>((set) => ({
    mode: 'ENTRY',
    cameraTarget: [0, 0, 5],
    isTransitioning: false,

    setMode: (mode) => set({ mode }),
    setCameraTarget: (target) => set({ cameraTarget: target }),
    startTransition: () => set({ isTransitioning: true }),
    endTransition: () => set({ isTransitioning: false }),
}));
