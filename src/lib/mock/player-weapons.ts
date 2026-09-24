import { MOCK_WEAPONS } from "@/lib/mock/weapons";

/**
 * Kemajuan bermain tiruan. Fase retensi nanti mengisinya dari tabel
 * `player_stats`; untuk sekarang angkanya cukup untuk menunjukkan bahwa syarat
 * membuka senjata benar-benar dihitung dari sesuatu.
 */
export const MOCK_PLAYER_PROGRESS = {
  matchesPlayed: 9,
  wins: 2,
  totalKills: 41,
};

/**
 * Kepemilikan senjata per pemain, bentuknya mengikuti tabel `player_weapons`
 * di PRD (is_unlocked dan kapan terbukanya), ditambah keterangan syarat dalam
 * bahasa awam supaya pemain tahu apa yang harus dikejar.
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

const WINS_FOR_SHOTGUN = 5;
const KILLS_FOR_SNIPER = 60;

/** Statistik kemajuan yang dipakai syarat pembukaan senjata. */
export type UnlockStat = "wins" | "totalKills";

/** Syarat buka senjata dalam bentuk data, supaya bisa dihitung ulang. */
export const WEAPON_UNLOCK_RULES: { weaponId: string; stat: UnlockStat; target: number; label: string }[] = [
  { weaponId: "wpn-shotgun-badai", stat: "wins", target: WINS_FOR_SHOTGUN, label: `Menangi ${WINS_FOR_SHOTGUN} pertandingan` },
  { weaponId: "wpn-sniper-elang", stat: "totalKills", target: KILLS_FOR_SNIPER, label: `Kumpulkan ${KILLS_FOR_SNIPER} kill` },
];

export const MOCK_PLAYER_WEAPONS: WeaponOwnership[] = [
  { weaponId: "wpn-pistol-p9", isUnlocked: true, requirement: null, progress: null, progressLabel: null },
  { weaponId: "wpn-smg-vektor", isUnlocked: true, requirement: null, progress: null, progressLabel: null },
  { weaponId: "wpn-rifle-garuda", isUnlocked: true, requirement: null, progress: null, progressLabel: null },
  {
    weaponId: "wpn-shotgun-badai",
    isUnlocked: false,
    requirement: `Menangi ${WINS_FOR_SHOTGUN} pertandingan`,
    progress: Math.min(1, MOCK_PLAYER_PROGRESS.wins / WINS_FOR_SHOTGUN),
    progressLabel: `${MOCK_PLAYER_PROGRESS.wins} / ${WINS_FOR_SHOTGUN}`,
  },
  {
    weaponId: "wpn-sniper-elang",
    isUnlocked: false,
    requirement: `Kumpulkan ${KILLS_FOR_SNIPER} kill`,
    progress: Math.min(1, MOCK_PLAYER_PROGRESS.totalKills / KILLS_FOR_SNIPER),
    progressLabel: `${MOCK_PLAYER_PROGRESS.totalKills} / ${KILLS_FOR_SNIPER}`,
  },
];

const byId = new Map(MOCK_PLAYER_WEAPONS.map((item) => [item.weaponId, item]));

/**
 * Kepemilikan satu senjata. Senjata yang tidak tercatat dianggap terbuka,
 * supaya menambah senjata baru ke daftar tidak diam-diam menguncinya.
 */
export function weaponOwnership(weaponId: string): WeaponOwnership {
  return (
    byId.get(weaponId) ?? {
      weaponId,
      isUnlocked: true,
      requirement: null,
      progress: null,
      progressLabel: null,
    }
  );
}

export function isWeaponUnlocked(weaponId: string): boolean {
  return weaponOwnership(weaponId).isUnlocked;
}

/** Senjata terbuka pertama, dipakai sebagai cadangan pilihan yang sah. */
export function firstUnlockedWeaponId(): string {
  const unlocked = MOCK_WEAPONS.find((weapon) => isWeaponUnlocked(weapon.id));
  return unlocked?.id ?? MOCK_WEAPONS[0].id;
}
