import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import { DEFAULT_LOADOUT, KILLSTREAKS, findKillstreak, type KillstreakId } from "@/lib/game/killstreak";

/**
 * Keadaan killstreak pemain lokal selama pertandingan.
 *
 * `streak` adalah kill beruntun dalam nyawa saat ini; `ready` adalah hadiah
 * yang sudah terbuka tapi belum dipanggil (tetap tersimpan walau pemain
 * tumbang, seperti di COD); `active` adalah hadiah yang sedang berjalan
 * beserta kapan berakhirnya (milidetik performance.now).
 */
/** Status satu hadiah untuk pemain: harga buka dan sudah terbuka atau belum. */
export interface RewardStatus {
  id: KillstreakId;
  unlockPrice: number;
  unlocked: boolean;
}

interface KillstreakState {
  streak: number;
  bestStreak: number;
  ready: KillstreakId[];
  active: Partial<Record<KillstreakId, number>>;
  /** Hadiah yang dibawa ke pertandingan, urut sesuai tombol 6, 7, 8; null = slot kosong. */
  loadout: (KillstreakId | null)[];
  /** Status terbuka tiap hadiah untuk pemain ini, dari server. */
  rewardStatus: RewardStatus[];
  /** Penanda hadiah yang BARU saja terbuka, untuk animasi HUD. */
  lastUnlocked: { id: KillstreakId; at: number } | null;
  /** Hadiah yang sedang menunggu pemain memilih sasaran di denah. */
  targeting: KillstreakId | null;
  /** Serangan udara yang sudah diluncurkan: titik sasaran dan waktu diluncurkan (ms). */
  strike: { x: number; z: number; launchedAt: number } | null;
  /** Berapa kali tiap hadiah dipanggil di pertandingan ini. */
  used: Partial<Record<KillstreakId, number>>;
  /** Kill yang dihasilkan tiap hadiah di pertandingan ini. */
  killsBy: Partial<Record<KillstreakId, number>>;

  /**
   * Memanggil hadiah yang sudah siap. Mengembalikan false bila hadiah itu
   * belum terbuka atau masih berjalan, supaya penekan tombol tahu tidak ada
   * yang terjadi.
   */
  activate: (id: KillstreakId) => boolean;
  /** Mengakhiri hadiah aktif yang waktunya sudah habis. */
  expire: (now: number) => void;
  /** Membuka denah untuk memilih sasaran hadiah (serangan udara). */
  beginTargeting: (id: KillstreakId) => boolean;
  /** Menutup denah tanpa meluncurkan apa pun; hadiah tetap siap. */
  cancelTargeting: () => void;
  /** Meluncurkan serangan udara ke titik yang dipilih. */
  launchStrike: (target: { x: number; z: number }) => boolean;
  /** Mencatat satu kill yang dihasilkan sebuah hadiah. */
  recordRewardKill: (id: KillstreakId) => void;
  /** Mengosongkan semuanya untuk pertandingan baru. */
  resetForMatch: () => void;
  /**
   * Mencatat satu kill pemain: kill beruntun naik, dan hadiah loadout yang
   * ambangnya baru tercapai menjadi siap. Mengembalikan hadiah yang baru terbuka.
   */
  registerKill: () => KillstreakId[];
  /** Pemain tumbang: kill beruntun kembali nol. Hadiah yang sudah siap tetap tersimpan. */
  registerDeath: () => void;
  /** Memuat loadout tersimpan pemain dari server. */
  loadLoadout: () => Promise<void>;
  /** Mengganti loadout di klien (mis. sesudah disimpan dari halaman loadout). */
  setLoadout: (loadout: (KillstreakId | null)[]) => void;
}

/** Keadaan awal tiap pertandingan: belum ada kill beruntun maupun hadiah. */
const FRESH_STATE: Pick<KillstreakState, "streak" | "bestStreak" | "ready" | "active"> = {
  streak: 0,
  bestStreak: 0,
  ready: [],
  active: {},
};

export const useKillstreakStore = create<KillstreakState>((set, get) => ({
  ...FRESH_STATE,
  loadout: DEFAULT_LOADOUT,
  rewardStatus: KILLSTREAKS.map((item) => ({ id: item.id, unlockPrice: item.unlockPrice, unlocked: item.unlockPrice === 0 })),
  lastUnlocked: null,
  targeting: null,
  strike: null,
  used: {},
  killsBy: {},

  activate: (id) => {
    const { ready, active } = get();
    if (!ready.includes(id) || active[id] !== undefined) return false;
    const endsAt = performance.now() + findKillstreak(id).durationSeconds * 1000;
    set((state) => ({
      ready: ready.filter((item) => item !== id),
      active: { ...active, [id]: endsAt },
      used: { ...state.used, [id]: (state.used[id] ?? 0) + 1 },
    }));
    return true;
  },

  loadLoadout: async () => {
    const result = await apiFetch<{ loadout: (KillstreakId | null)[]; rewards: RewardStatus[] }>(
      "/api/killstreak/loadout",
    );
    if (result.ok) {
      set({
        loadout: result.data.loadout,
        rewardStatus: result.data.rewards.map(({ id, unlockPrice, unlocked }) => ({ id, unlockPrice, unlocked })),
      });
    }
  },

  setLoadout: (loadout) => set({ loadout }),

  registerKill: () => {
    const { streak, bestStreak, loadout, ready } = get();
    const next = streak + 1;
    const unlocked = loadout.filter(
      (id): id is KillstreakId => id !== null && findKillstreak(id).kills === next && !ready.includes(id),
    );
    set({
      streak: next,
      bestStreak: Math.max(bestStreak, next),
      ready: [...ready, ...unlocked],
      lastUnlocked: unlocked.length > 0 ? { id: unlocked[unlocked.length - 1], at: performance.now() } : get().lastUnlocked,
    });
    return unlocked;
  },

  registerDeath: () => set({ streak: 0 }),

  recordRewardKill: (id) =>
    set((state) => ({ killsBy: { ...state.killsBy, [id]: (state.killsBy[id] ?? 0) + 1 } })),

  resetForMatch: () =>
    set({
      ...FRESH_STATE,
      active: {},
      lastUnlocked: null,
      targeting: null,
      strike: null,
      used: {},
      killsBy: {},
    }),

  expire: (now) => {
    const { active } = get();
    const entries = Object.entries(active) as [KillstreakId, number][];
    if (!entries.some(([, endsAt]) => endsAt <= now)) return;
    const next = Object.fromEntries(entries.filter(([, endsAt]) => endsAt > now));
    set({ active: next, strike: next.serangan_udara === undefined ? null : get().strike });
  },

  beginTargeting: (id) => {
    const { ready, active } = get();
    if (!ready.includes(id) || active[id] !== undefined) return false;
    set({ targeting: id });
    return true;
  },

  cancelTargeting: () => set({ targeting: null }),

  launchStrike: (target) => {
    if (get().targeting !== "serangan_udara") return false;
    set({ targeting: null });
    if (!get().activate("serangan_udara")) return false;
    set({ strike: { ...target, launchedAt: performance.now() } });
    return true;
  },
}));
