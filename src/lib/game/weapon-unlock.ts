/**
 * Aturan membuka senjata, dipakai bersama klien dan server. Kemajuan pemain
 * (menang, total kill) dihitung server dari riwayat pertandingan sungguhan;
 * uji coba dan latihan tidak ikut dihitung.
 */

/** Statistik kemajuan yang dipakai syarat pembukaan senjata. */
export type UnlockStat = "wins" | "totalKills";

export interface WeaponProgress {
  wins: number;
  totalKills: number;
}

export const EMPTY_PROGRESS: WeaponProgress = { wins: 0, totalKills: 0 };

const WINS_FOR_SHOTGUN = 5;
const KILLS_FOR_SNIPER = 60;

/** Syarat buka senjata dalam bentuk data, supaya bisa dihitung ulang. */
export const WEAPON_UNLOCK_RULES: { weaponId: string; stat: UnlockStat; target: number; label: string }[] = [
  { weaponId: "wpn-shotgun-badai", stat: "wins", target: WINS_FOR_SHOTGUN, label: `Menangi ${WINS_FOR_SHOTGUN} pertandingan` },
  { weaponId: "wpn-sniper-elang", stat: "totalKills", target: KILLS_FOR_SNIPER, label: `Kumpulkan ${KILLS_FOR_SNIPER} kill` },
];

/**
 * Kepemilikan senjata per pemain, ditambah keterangan syarat dalam bahasa
 * awam supaya pemain tahu apa yang harus dikejar.
 */
export interface WeaponOwnership {
  weaponId: string;
  isUnlocked: boolean;
  /** Syarat membuka, ditulis untuk dibaca pemain. Null bila sudah terbuka. */
  requirement: string | null;
  /** Kemajuan menuju syarat itu, 0..1. Null bila sudah terbuka. */
  progress: number | null;
  /** Bentuk "2 / 5" untuk ditampilkan di samping bar kemajuan. */
  progressLabel: string | null;
}

/**
 * Kepemilikan satu senjata menurut kemajuan pemain. Senjata tanpa syarat
 * terbuka sejak awal, supaya menambah senjata baru tidak diam-diam menguncinya.
 */
export function computeOwnership(weaponId: string, progress: WeaponProgress): WeaponOwnership {
  const rule = WEAPON_UNLOCK_RULES.find((item) => item.weaponId === weaponId);
  const value = rule ? Math.max(0, progress[rule.stat]) : 0;
  if (!rule || value >= rule.target) {
    return { weaponId, isUnlocked: true, requirement: null, progress: null, progressLabel: null };
  }
  return {
    weaponId,
    isUnlocked: false,
    requirement: rule.label,
    progress: Math.min(1, value / rule.target),
    progressLabel: `${value} / ${rule.target}`,
  };
}
