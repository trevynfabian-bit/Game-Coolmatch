import { create } from "zustand";
import { KILLSTREAKS, findKillstreak, type KillstreakId } from "@/lib/game/killstreak";

/**
 * Keadaan killstreak pemain lokal selama pertandingan.
 *
 * `streak` adalah kill beruntun dalam nyawa saat ini; `ready` adalah hadiah
 * yang sudah terbuka tapi belum dipanggil (tetap tersimpan walau pemain
 * tumbang, seperti di COD); `active` adalah hadiah yang sedang berjalan
 * beserta kapan berakhirnya (milidetik performance.now).
 */
interface KillstreakState {
  streak: number;
  bestStreak: number;
  ready: KillstreakId[];
  active: Partial<Record<KillstreakId, number>>;
  /** Hadiah yang dipakai di pertandingan ini, urut sesuai loadout (tombol 6, 7, 8). */
  loadout: KillstreakId[];
  /** Penanda hadiah yang BARU saja terbuka, untuk animasi HUD. */
  lastUnlocked: { id: KillstreakId; at: number } | null;

  /**
   * Memanggil hadiah yang sudah siap. Mengembalikan false bila hadiah itu
   * belum terbuka atau masih berjalan, supaya penekan tombol tahu tidak ada
   * yang terjadi.
   */
  activate: (id: KillstreakId) => boolean;
  /** Mengakhiri hadiah aktif yang waktunya sudah habis. */
  expire: (now: number) => void;
}

/** Data tiruan untuk fase frontend: UAV sudah siap dipanggil. */
const MOCK_STATE: Pick<KillstreakState, "streak" | "bestStreak" | "ready" | "active"> = {
  streak: 3,
  bestStreak: 4,
  ready: ["uav"],
  active: {},
};

export const useKillstreakStore = create<KillstreakState>((set, get) => ({
  ...MOCK_STATE,
  loadout: KILLSTREAKS.map((item) => item.id),
  lastUnlocked: null,

  activate: (id) => {
    const { ready, active } = get();
    if (!ready.includes(id) || active[id] !== undefined) return false;
    const endsAt = performance.now() + findKillstreak(id).durationSeconds * 1000;
    set({
      ready: ready.filter((item) => item !== id),
      active: { ...active, [id]: endsAt },
    });
    return true;
  },

  expire: (now) => {
    const { active } = get();
    const entries = Object.entries(active) as [KillstreakId, number][];
    if (!entries.some(([, endsAt]) => endsAt <= now)) return;
    set({ active: Object.fromEntries(entries.filter(([, endsAt]) => endsAt > now)) });
  },
}));
