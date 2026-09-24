/**
 * Hadiah killstreak: kill beruntun dalam satu nyawa membuka hadiah bertingkat.
 *
 * Ambang di sini sama dengan bonus koin killstreak (lihat coin-rules), jadi
 * pemain yang membuka UAV sekaligus tahu ia mendapat koin tambahan.
 */

export type KillstreakId = "uav" | "serangan_udara" | "helikopter";

export interface KillstreakReward {
  id: KillstreakId;
  name: string;
  /** Kill beruntun yang dibutuhkan untuk membukanya. */
  kills: number;
  /** Keterangan singkat untuk HUD dan halaman loadout. */
  blurb: string;
  /** Tombol untuk memanggilnya, sebagai kode tombol dan label. */
  key: { code: string; label: string };
  /** Warna penanda di HUD. */
  color: string;
  /** Lama hadiah bekerja setelah dipanggil, dalam detik. */
  durationSeconds: number;
  /** Benar bila pemanggilannya butuh memilih titik sasaran di denah. */
  needsTarget: boolean;
}

export const KILLSTREAKS: KillstreakReward[] = [
  {
    id: "uav",
    name: "Radar UAV",
    kills: 3,
    blurb: "Posisi semua musuh muncul di radar mini selama beberapa detik.",
    key: { code: "Digit6", label: "6" },
    color: "#38bdf8",
    durationSeconds: 20,
    needsTarget: false,
  },
  {
    id: "serangan_udara",
    name: "Serangan Udara",
    kills: 5,
    blurb: "Tandai satu titik; rentetan ledakan menghantam area itu.",
    key: { code: "Digit7", label: "7" },
    color: "#f97316",
    durationSeconds: 5,
    needsTarget: true,
  },
  {
    id: "helikopter",
    name: "Helikopter Dukungan",
    kills: 7,
    blurb: "Helikopter berputar di atas arena dan menembaki musuh.",
    key: { code: "Digit8", label: "8" },
    color: "#a3e635",
    durationSeconds: 30,
    needsTarget: false,
  },
];

export function findKillstreak(id: KillstreakId): KillstreakReward {
  return KILLSTREAKS.find((item) => item.id === id)!;
}

/** Hadiah berikutnya yang belum terbuka pada streak ini, atau null bila semua sudah. */
export function nextKillstreak(
  streak: number,
  rewards: KillstreakReward[] = KILLSTREAKS,
): KillstreakReward | null {
  return rewards.find((item) => item.kills > streak) ?? null;
}

/** Aturan serangan udara. */
export const AIRSTRIKE = {
  /** Jari-jari area hantaman, dalam satuan dunia. */
  radius: 6,
  /** Jumlah ledakan yang jatuh berurutan di dalam area. */
  bombs: 6,
  /** Jeda dari penandaan sampai ledakan pertama, dalam detik. */
  delaySeconds: 1.5,
  /** Kerusakan per ledakan pada petarung di titik pusat ledakan. */
  damage: 120,
  /** Jari-jari satu ledakan. */
  blastRadius: 3.2,
} as const;

/**
 * Memanggil hadiah: yang butuh sasaran membuka denah (dan melepas kursor
 * supaya denah bisa diklik), sisanya langsung aktif.
 */
export function callKillstreak(
  id: KillstreakId,
  store: { activate: (id: KillstreakId) => boolean; beginTargeting: (id: KillstreakId) => boolean },
): boolean {
  if (findKillstreak(id).needsTarget) {
    const opened = store.beginTargeting(id);
    if (opened && typeof document !== "undefined" && document.pointerLockElement) {
      document.exitPointerLock();
    }
    return opened;
  }
  return store.activate(id);
}
