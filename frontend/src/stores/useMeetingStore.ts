import { create } from 'zustand';
import { Meeting } from '@/types';
import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Spatial Modes
export type ViewMode = 'idle' | 'timeline' | 'live' | 'detail' | 'analysis';

interface MeetingStoreState {
    meetings: Meeting[];
    activeMeetingId: string | null;
    viewMode: ViewMode;
    isLoading: boolean;

    // Actions
    fetchMeetings: () => Promise<void>;
    startMeeting: (agentId: string) => Promise<void>;
    endMeeting: (meetingId: string) => Promise<void>;
    setActiveMeeting: (id: string | null) => void;
    setViewMode: (mode: ViewMode) => void;

    // Realtime Updates (Placeholder for connection logic)
    updateMeetingStatus: (id: string, status: string) => void;

    activeTranscript: any[];
    subscribeToMeeting: (meetingId: string) => void;
}

export const useMeetingStore = create<MeetingStoreState>((set, get) => ({
    meetings: [],
    activeMeetingId: null,
    viewMode: 'timeline',
    isLoading: false,

    fetchMeetings: async () => {
        set({ isLoading: true });
        try {
            // Re-using the /meetings/ endpoint. 
            // NOTE: Ideally we'd filter this to show all meetings, not just for one agent unless filtered.
            // The current API might expect an agent_id param? Let's check api/v1/meetings.py.
            // If it supports no params to list all user meetings, we use that.
            const data = await apiRequest<Meeting[]>('/meetings/');
            set({ meetings: data });
        } catch (error) {
            console.error("Failed to fetch meetings grid", error);
        } finally {
            set({ isLoading: false });
        }
    },

    startMeeting: async (agentId: string) => {
        set({ isLoading: true });
        try {
            const newMeeting = await apiRequest<Meeting>('/meetings/', 'POST', { agent_id: agentId });
            set((state) => ({
                meetings: [newMeeting, ...state.meetings],
                activeMeetingId: newMeeting.id,
                viewMode: 'live' // Switch to live view immediately
            }));
            // Immediately subscribe
            get().subscribeToMeeting(newMeeting.id);
        } catch (error) {
            console.error("Failed to start meeting", error);
        } finally {
            set({ isLoading: false });
        }
    },

    endMeeting: async (meetingId: string) => {
        try {
            // Optimistic update
            set((state) => ({
                meetings: state.meetings.map(m => m.id === meetingId ? { ...m, status: 'completed' } : m)
            }));

            const updated = await apiRequest<Meeting>(`/meetings/${meetingId}`, 'PATCH', { status: 'completed' });

            // Sync with backend response
            set((state) => ({
                meetings: state.meetings.map(m => m.id === meetingId ? updated : m)
            }));
        } catch (error) {
            console.error("Failed to end meeting", error);
        }
    },

    setActiveMeeting: (id) => {
        set({ activeMeetingId: id });
        if (id) {
            set({ viewMode: 'detail' });
        } else {
            set({ viewMode: 'timeline' });
        }
    },

    setViewMode: (mode) => set({ viewMode: mode }),

    updateMeetingStatus: (id, status) => {
        set((state) => ({
            meetings: state.meetings.map(m =>
                m.id === id ? { ...m, status } : m
            )
        }));
    },

    // --- REALTIME ---
    activeTranscript: [],

    subscribeToMeeting: (meetingId) => {
        console.log("Subscribing to meeting:", meetingId);
        // Reset transcript
        set({ activeTranscript: [] });

        // Subscribe
        const channel = supabase
            .channel(`meeting:${meetingId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'meeting_transcripts',
                    filter: `meeting_id=eq.${meetingId}`,
                },
                (payload: any) => {
                    console.log("Realtime Transcript:", payload.new);
                    set((state) => ({
                        activeTranscript: [...state.activeTranscript, payload.new]
                    }));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'meeting_costs',
                    filter: `meeting_id=eq.${meetingId}`,
                },
                (payload: any) => {
                    console.log("Realtime Cost Update:", payload.new);
                    // Update the specific meeting in the list
                    set((state) => ({
                        meetings: state.meetings.map(m =>
                            m.id === meetingId
                                ? { ...m, total_cost: payload.new.total_cost }
                                : m
                        )
                    }));
                }
            )
            .subscribe();

        // Store channel for cleanup if needed (not implemented in this simple store yet)
    }
}));
