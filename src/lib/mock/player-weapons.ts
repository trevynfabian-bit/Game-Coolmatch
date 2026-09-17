import type { UnlockRequirement } from "@/lib/game/unlock";
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
  /**
   * Syarat membuka sebagai ANGKA. Kalimat, bar kemajuan, dan sisa yang
   * dibutuhkan semuanya diturunkan darinya lewat `unlockFacts`, sehingga tidak
   * ada dua keterangan yang bisa berselisih. Null bila senjatanya sudah
   * terbuka.
   */
  requirement: UnlockRequirement | null;
}

const WINS_FOR_SHOTGUN = 5;
const KILLS_FOR_SNIPER = 60;

export const MOCK_PLAYER_WEAPONS: WeaponOwnership[] = [
  { weaponId: "wpn-pistol-p9", isUnlocked: true, requirement: null },
  { weaponId: "wpn-smg-vektor", isUnlocked: true, requirement: null },
  { weaponId: "wpn-rifle-garuda", isUnlocked: true, requirement: null },
  {
    weaponId: "wpn-shotgun-badai",
    isUnlocked: false,
    requirement: {
      kind: "wins",
      current: MOCK_PLAYER_PROGRESS.wins,
      target: WINS_FOR_SHOTGUN,
    },
  },
  {
    weaponId: "wpn-sniper-elang",
    isUnlocked: false,
    requirement: {
      kind: "kills",
      current: MOCK_PLAYER_PROGRESS.totalKills,
      target: KILLS_FOR_SNIPER,
    },
  },
];

const byId = new Map(MOCK_PLAYER_WEAPONS.map((item) => [item.weaponId, item]));

/**
 * Kepemilikan satu senjata. Senjata yang tidak tercatat dianggap terbuka,
 * supaya menambah senjata baru ke daftar tidak diam-diam menguncinya.
 */
export function weaponOwnership(weaponId: string): WeaponOwnership {
  return (
    byId.get(weaponId) ?? { weaponId, isUnlocked: true, requirement: null }
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
