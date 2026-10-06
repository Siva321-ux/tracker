import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  type: 'chat' | 'device' | 'team' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationStoreState {
  notifications: NotificationItem[];
  addNotification: (
    type: 'chat' | 'device' | 'team' | 'system',
    title: string,
    message: string
  ) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [
    {
      id: 'init_1',
      type: 'system',
      title: '🌐 LoRa Mesh System Online',
      message: 'Node antenna mesh network active and listening for telemetry.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    }
  ],
  addNotification: (type, title, message) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newItem: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      title,
      message,
      time: timeStr,
      read: false
    };

    // Request browser notification permission & trigger push notification if available
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body: message });
        } catch (e) {}
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            try {
              new Notification(title, { body: message });
            } catch (e) {}
          }
        });
      }
    }

    set((state) => ({
      notifications: [newItem, ...state.notifications]
    }));
  },
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    })),
  clearNotifications: () => set({ notifications: [] })
}));
