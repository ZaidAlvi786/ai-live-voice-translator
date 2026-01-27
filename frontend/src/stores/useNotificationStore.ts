import { create } from 'zustand';
import { apiRequest } from '@/lib/api';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    created_at: string;
}

interface NotificationStore {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;

    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    checkUnread: () => void;
    subscribe: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,

    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const data = await apiRequest<Notification[]>('/notifications');
            set({
                notifications: data,
                loading: false
            });
            get().checkUnread();
        } catch (error) {
            console.error('Failed to fetch notifications', error);
            set({ loading: false });
        }
    },

    markAsRead: async (id: string) => {
        // Optimistic update
        set(state => ({
            notifications: state.notifications.map(n =>
                n.id === id ? { ...n, read: true } : n
            )
        }));
        get().checkUnread();

        try {
            await apiRequest(`/notifications/${id}/read`, 'PATCH');
        } catch (error) {
            console.error('Failed to mark read', error);
            // Revert if needed, but low priority for read status
        }
    },

    checkUnread: () => {
        const count = get().notifications.filter(n => !n.read).length;
        set({ unreadCount: count });
    },

    subscribe: (userId: string) => {
        const { supabase } = require('@/lib/supabase'); // Lazy load or import at top
        
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload: any) => {
                    const newNote = payload.new as Notification;
                    set(state => ({
                        notifications: [newNote, ...state.notifications],
                        unreadCount: state.unreadCount + 1
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
}));
