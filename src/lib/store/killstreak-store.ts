import { create } from "zustand";
import { KILLSTREAKS, type KillstreakId } from "@/lib/game/killstreak";

/**
 * Keadaan killstreak pemain lokal selama pertandingan.
 *
 * `streak` adalah kill beruntun dalam nyawa saat ini; `ready` adalah hadiah
 * yang sudah terbuka tapi belum dipanggil (tetap tersimpan walau pemain
 * tumbang, seperti di COD); `active` adalah hadiah yang sedang berjalan
 * beserta kapan berakhirnya (detik performance.now).
 */
interface KillstreakState {
  streak: number;
  bestStreak: number;
  ready: KillstreakId[];
  active: Partial<Record<KillstreakId, number>>;
  /** Hadiah yang dipakai di pertandingan ini, urut sesuai loadout. */
  loadout: KillstreakId[];
  /** Penanda hadiah yang BARU saja terbuka, untuk animasi HUD. */
  lastUnlocked: { id: KillstreakId; at: number } | null;
}

/** Data tiruan untuk fase frontend: dua kill beruntun, UAV tinggal satu kill lagi. */
const MOCK_STATE: Pick<KillstreakState, "streak" | "bestStreak" | "ready" | "active"> = {
  streak: 2,
  bestStreak: 4,
  ready: [],
  active: {},
};

export const useKillstreakStore = create<KillstreakState>(() => ({
  ...MOCK_STATE,
  loadout: KILLSTREAKS.map((item) => item.id),
  lastUnlocked: null,
}));
