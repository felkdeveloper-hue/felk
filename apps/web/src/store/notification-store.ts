import { create } from 'zustand';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message?: string;
  severity: NotificationSeverity;
  createdAt: string;
  isRead: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
}

interface NotificationActions {
  add: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => string;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

export type NotificationStore = NotificationState & NotificationActions;

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  add: (notification) => {
    const id = generateId();
    set((state) => ({
      notifications: [
        { ...notification, id, createdAt: new Date().toISOString(), isRead: false },
        ...state.notifications,
      ],
    }));
    return id;
  },

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification,
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, isRead: true })),
    })),

  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),

  clear: () => set({ notifications: [] }),
}));

export function selectUnreadCount(state: NotificationStore): number {
  return state.notifications.filter((notification) => !notification.isRead).length;
}
