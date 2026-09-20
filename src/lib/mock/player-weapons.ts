import type { UnlockRequirement } from "@/lib/game/unlock";
import { progressValue } from "@/lib/game/unlock-event";
import {
  WEAPON_UNLOCK_RULES,
  meetsUnlockRule,
} from "@/lib/game/weapon-unlock-rules";
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

/**
 * Kepemilikan tiruan, DITURUNKAN dari aturan buka senjata dan kemajuan di
 * atas — bukan ditulis ulang sebagai daftar tersendiri.
 *
 * Sebelumnya ambang "5 kemenangan" dan "60 kill" ditulis di sini, terpisah
 * dari aturan yang nanti dipakai server. Dua salinan aturan yang sama adalah
 * dua angka yang bisa berselisih, dan yang kalah adalah pemain yang melihat
 * bar kemajuannya penuh di layar Koleksi sementara servernya tetap menganggap
 * senjatanya terkunci.
 *
 * `current` diisi dari kemajuan tiruan supaya bar kemajuannya bergerak;
 * aturannya sendiri tidak menyimpan potret itu.
 */
export const MOCK_PLAYER_WEAPONS: WeaponOwnership[] = WEAPON_UNLOCK_RULES.map(
  (rule) => {
    if (!rule.requirement) {
      return { weaponId: rule.weaponId, isUnlocked: true, requirement: null };
    }
    const requirement: UnlockRequirement = {
      kind: rule.requirement.kind,
      current: progressValue(rule.requirement.kind, MOCK_PLAYER_PROGRESS),
      target: rule.requirement.target,
    };
    return {
      weaponId: rule.weaponId,
      isUnlocked: meetsUnlockRule(rule, MOCK_PLAYER_PROGRESS),
      requirement,
    };
  },
);

const byId = new Map(MOCK_PLAYER_WEAPONS.map((item) => [item.weaponId, item]));

/**
 * Kepemilikan satu senjata. Senjata yang tidak tercatat dianggap terbuka,
 * supaya menambah senjata baru ke daftar tidak diam-diam menguncinya.
 *
 * `earned` adalah senjata yang terbuka karena pemain memainkannya — hasil
 * kemajuan, bukan bawaan. Ia dioper sebagai ARGUMEN alih-alih dibaca dari
 * penyimpanan di dalam sini, dan itu disengaja: fungsi ini dipanggil dari
 * lingkup modul (senjata bawaan loadout, deretan slot tukar senjata) yang
 * tidak boleh bergantung pada keadaan yang hidup, dan dari render komponen
 * yang justru harus. Dengan argumen, tiap pemanggil menentukan sendiri
 * jawabannya dan fungsinya tetap murni.
 */
export function weaponOwnership(
  weaponId: string,
  earned: readonly string[] = [],
): WeaponOwnership {
  const bawaan = byId.get(weaponId) ?? {
    weaponId,
    isUnlocked: true,
    requirement: null,
  };
  if (bawaan.isUnlocked || !earned.includes(weaponId)) return bawaan;

  // Sudah terbuka: syaratnya tidak lagi punya pekerjaan, dan membiarkannya
  // terisi membuat kartu senjata menampilkan bar kemajuan untuk sesuatu yang
  // sudah selesai.
  return { weaponId, isUnlocked: true, requirement: null };
}

export function isWeaponUnlocked(
  weaponId: string,
  earned: readonly string[] = [],
): boolean {
  return weaponOwnership(weaponId, earned).isUnlocked;
}

/** Senjata terbuka pertama, dipakai sebagai cadangan pilihan yang sah. */
export function firstUnlockedWeaponId(earned: readonly string[] = []): string {
  const unlocked = MOCK_WEAPONS.find((weapon) =>
    isWeaponUnlocked(weapon.id, earned),
  );
  return unlocked?.id ?? MOCK_WEAPONS[0].id;
}

/** Senjata yang boleh dibawa bertanding, urut sesuai nomor slotnya. */
export function unlockedWeapons(earned: readonly string[] = []) {
  return MOCK_WEAPONS.filter((weapon) => isWeaponUnlocked(weapon.id, earned));
}
