import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'diet';

export interface Notification {
    id: string;
    title: string;
    description: string;
    timestamp: number;
    type: NotificationType;
    link?: string;
    read: boolean;
}

interface NotificationState {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [
                // Initial demo data
                {
                    id: '1',
                    title: "Cita Programada",
                    description: "Tienes una cita con Juan Perez a las 3:00 PM",
                    timestamp: Date.now() - 1000 * 60 * 10, // 10 mins ago
                    type: 'appointment',
                    link: '/agenda',
                    read: false
                },
                {
                    id: '2',
                    title: "Dieta Aprobada",
                    description: "El plan nutricional para Maria ha sido guardado",
                    timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
                    type: 'diet',
                    link: '/pacientes', // Ideally to a specific patient
                    read: false
                },
                {
                    id: '3',
                    title: "Recordatorio",
                    description: "Actualizar inventario de suplementos",
                    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
                    type: 'info',
                    read: false
                }
            ],
            addNotification: (notification) =>
                set((state) => ({
                    notifications: [
                        {
                            id: Math.random().toString(36).substring(7),
                            timestamp: Date.now(),
                            read: false,
                            ...notification,
                        },
                        ...state.notifications,
                    ],
                })),
            markAsRead: (id) =>
                set((state) => ({
                    notifications: state.notifications.map((n) =>
                        n.id === id ? { ...n, read: true } : n
                    ),
                })),
            markAllAsRead: () =>
                set((state) => ({
                    notifications: state.notifications.map((n) => ({ ...n, read: true })),
                })),
            removeNotification: (id) =>
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                })),
            clearAll: () => set({ notifications: [] }),
        }),
        {
            name: 'notifications-storage',
        }
    )
);
