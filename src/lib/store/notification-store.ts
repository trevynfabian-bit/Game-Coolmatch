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
  /** Menambah notifikasi yang lahir di klien (mis. hasil pertandingan barusan). */
  push: (item: Omit<RewardNotification, "id" | "createdAt" | "seenAt">) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: MOCK_NOTIFICATIONS,
  hydrate: (items) => set({ items }),
  markSeen: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id && item.seenAt === null ? { ...item, seenAt: Date.now() } : item)),
    })),
  push: (item) =>
    set((state) => ({
      items: [
        { ...item, id: Math.max(0, ...state.items.map((entry) => entry.id)) + 1, createdAt: Date.now(), seenAt: null },
        ...state.items,
      ],
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

/**
 * Id item yang punya notifikasi belum dilihat, per jenis. Dipakai daftar
 * koleksi untuk menandai item "Baru" dengan pola yang sama seperti penanda
 * senjata baru.
 */
export function unseenItemIds(items: RewardNotification[], kind: RewardNotification["kind"]): Set<string> {
  return new Set(
    items.filter((item) => item.kind === kind && item.seenAt === null && item.itemId).map((item) => item.itemId!),
  );
}

/** Menandai dilihat semua notifikasi yang menunjuk item tertentu. */
export function markItemSeen(kind: RewardNotification["kind"], itemId: string): void {
  const { items, markSeen } = useNotificationStore.getState();
  for (const item of items) {
    if (item.kind === kind && item.itemId === itemId && item.seenAt === null) markSeen(item.id);
  }
}
