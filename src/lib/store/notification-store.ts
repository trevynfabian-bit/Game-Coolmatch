import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import type { RewardNotification } from "@/types/economy";

/**
 * Notifikasi hadiah pemain, dimuat dari /api/notifikasi. Server yang mencatat
 * notifikasi saat hadiah diberikan (koin pertandingan, hadiah killstreak
 * lewat pencapaian, dan seterusnya); klien hanya membaca dan menandai
 * dilihat. Penandaan diterapkan seketika di layar lalu dikirim ke server;
 * bila gagal, daftar dimuat ulang supaya kembali sama dengan server.
 */
interface NotificationState {
  items: RewardNotification[];
  status: "idle" | "loading" | "ready" | "error";
  load: () => Promise<void>;
  markSeen: (id: number) => void;
  markAllSeen: () => void;
  /** Menandai dilihat semua notifikasi yang menunjuk satu item. */
  markItem: (kind: RewardNotification["kind"], itemId: string) => void;
}

type SeenTarget = { all: true } | { ids: number[] } | { kind: RewardNotification["kind"]; itemId: string };

let loadGeneration = 0;

async function sendSeen(target: SeenTarget) {
  const response = await apiFetch<{ updated: number; unseenCount: number }>("/api/notifikasi/dilihat", {
    method: "POST",
    body: target,
  });
  if (!response.ok) void useNotificationStore.getState().load();
}

function markLocally(items: RewardNotification[], match: (item: RewardNotification) => boolean): RewardNotification[] {
  const now = Date.now();
  return items.map((item) => (item.seenAt === null && match(item) ? { ...item, seenAt: now } : item));
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  status: "idle",
  load: async () => {
    const generation = ++loadGeneration;
    if (get().status === "idle") set({ status: "loading" });
    const response = await apiFetch<{ notifications: RewardNotification[]; degraded?: boolean }>(
      "/api/notifikasi?limit=50",
    );
    if (generation !== loadGeneration) return;
    if (!response.ok || response.data.degraded) {
      set({ status: get().items.length > 0 ? "ready" : "error" });
      return;
    }
    set({ items: response.data.notifications, status: "ready" });
  },
  markSeen: (id) => {
    if (!get().items.some((item) => item.id === id && item.seenAt === null)) return;
    set((state) => ({ items: markLocally(state.items, (item) => item.id === id) }));
    void sendSeen({ ids: [id] });
  },
  markAllSeen: () => {
    if (!get().items.some((item) => item.seenAt === null)) return;
    set((state) => ({ items: markLocally(state.items, () => true) }));
    void sendSeen({ all: true });
  },
  markItem: (kind, itemId) => {
    const match = (item: RewardNotification) => item.kind === kind && item.itemId === itemId;
    if (!get().items.some((item) => item.seenAt === null && match(item))) return;
    set((state) => ({ items: markLocally(state.items, match) }));
    void sendSeen({ kind, itemId });
  },
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
  useNotificationStore.getState().markItem(kind, itemId);
}
