import { create } from "zustand";
import { MOCK_NOTIFICATIONS } from "@/lib/mock/notifications";
import type { RewardNotification } from "@/types/economy";

/**
 * Notifikasi hadiah pemain. Fase frontend memakai data tiruan; lapisan
 * backend nanti memuatnya dari /api/notifikasi dan menyimpan penanda
 * "sudah dilihat" di server.
 */
interface NotificationState {
  items: RewardNotification[];
  hydrate: (items: RewardNotification[]) => void;
  markSeen: (id: number) => void;
  markAllSeen: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: MOCK_NOTIFICATIONS,
  hydrate: (items) => set({ items }),
  markSeen: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id && item.seenAt === null ? { ...item, seenAt: Date.now() } : item)),
    })),
  markAllSeen: () =>
    set((state) => ({
      items: state.items.map((item) => (item.seenAt === null ? { ...item, seenAt: Date.now() } : item)),
    })),
}));

/** Jumlah notifikasi yang belum dilihat. */
export function unseenCount(items: RewardNotification[]): number {
  return items.filter((item) => item.seenAt === null).length;
}
