import type { PlayerProgress } from "@/lib/game/collection";
import { progressValue } from "@/lib/game/unlock-event";
import type { UnlockKind } from "@/lib/game/unlock";

/**
 * Syarat membuka tiap senjata — SATU-SATUNYA tempat angkanya ditulis.
 *
 * Sebelumnya "menangi 5 pertandingan" hidup di data tiruan klien, sementara
 * server yang akan memutuskan senjata mana yang benar-benar terbuka belum
 * punya acuan sama sekali. Dua salinan aturan seperti itu bukan sekadar
 * duplikasi: yang kalah adalah pemain yang melihat bar kemajuannya penuh di
 * layar Koleksi sementara servernya tetap menganggap senjata itu terkunci.
 *
 * Yang ditulis di sini hanyalah ATURANNYA — jenis dan ambangnya. Kemajuan
 * pemain datang dari tempat lain, dan itu disengaja: aturan yang membawa
 * potret kemajuan akan basi begitu pemain bertanding sekali lagi.
 */
export interface WeaponUnlockRule {
  weaponId: string;
  /** Null berarti senjata ini terbuka sejak awal. */
  requirement: { kind: UnlockKind; target: number } | null;
}

export const WEAPON_UNLOCK_RULES: readonly WeaponUnlockRule[] = [
  { weaponId: "wpn-pistol-p9", requirement: null },
  { weaponId: "wpn-smg-vektor", requirement: null },
  { weaponId: "wpn-rifle-garuda", requirement: null },
  {
    weaponId: "wpn-shotgun-badai",
    requirement: { kind: "wins", target: 5 },
  },
  {
    weaponId: "wpn-sniper-elang",
    requirement: { kind: "kills", target: 60 },
  },
] as const;

const BY_WEAPON = new Map(
  WEAPON_UNLOCK_RULES.map((rule) => [rule.weaponId, rule]),
);

/**
 * Aturan sebuah senjata. Senjata yang tidak tercatat dianggap terbuka sejak
 * awal, supaya menambah senjata baru ke katalog tidak diam-diam menguncinya
 * di balik syarat yang tidak pernah ditulis siapa pun.
 */
export function unlockRuleFor(weaponId: string): WeaponUnlockRule {
  return BY_WEAPON.get(weaponId) ?? { weaponId, requirement: null };
}

/** Benar bila kemajuan pemain sudah memenuhi syarat sebuah senjata. */
export function meetsUnlockRule(
  rule: WeaponUnlockRule,
  progress: PlayerProgress,
): boolean {
  if (!rule.requirement) return true;
  const { kind, target } = rule.requirement;
  return progressValue(kind, progress) >= target;
}

/**
 * Seluruh senjata yang SEHARUSNYA terbuka pada kemajuan tertentu, urut
 * katalog.
 *
 * Dihitung dari kemajuan, bukan dibaca dari catatan kepemilikan. Keduanya
 * dipakai berdampingan oleh layanan di server: yang ini menjawab "apa yang
 * berhak dimiliki pemain sekarang", catatan kepemilikan menjawab "apa yang
 * sudah pernah diberikan". Selisih keduanya itulah yang baru saja terbuka.
 */
export function weaponsUnlockedBy(progress: PlayerProgress): string[] {
  return WEAPON_UNLOCK_RULES.filter((rule) =>
    meetsUnlockRule(rule, progress),
  ).map((rule) => rule.weaponId);
}

/** Senjata yang terbuka sejak awal, tanpa syarat apa pun. */
export function starterWeaponIds(): string[] {
  return WEAPON_UNLOCK_RULES.filter((rule) => !rule.requirement).map(
    (rule) => rule.weaponId,
  );
}
