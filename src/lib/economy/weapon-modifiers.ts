import { findAttachment, findUpgradeTrack } from "@/lib/economy/upgrade-catalog";
import type { UpgradeStat, WeaponModifiers, WeaponUpgradeState } from "@/types/economy";
import type { Weapon } from "@/types/game";

/**
 * Menerapkan upgrade dan attachment pemain ke statistik dasar senjata.
 *
 * Fungsi murni ini adalah satu-satunya tempat efek toko dihitung: pratinjau
 * di toko, rincian di pilih senjata, dan senjata yang benar-benar dibawa ke
 * arena semuanya memakai hasil yang sama, jadi yang dijanjikan toko itulah
 * yang terasa saat menembak.
 */

function bonusOf(weaponId: string, stat: UpgradeStat, level: number): number {
  if (level <= 0) return 0;
  const tier = findUpgradeTrack(weaponId, stat)?.tiers.find((t) => t.level === level);
  return tier?.bonusPercent ?? 0;
}

/** Jumlah pengubah seluruh attachment yang TERPASANG. */
export function equippedModifiers(state: WeaponUpgradeState): Required<WeaponModifiers> {
  const total: Required<WeaponModifiers> = {
    damagePct: 0,
    fireRatePct: 0,
    spreadPct: 0,
    recoilPct: 0,
    reloadPct: 0,
    magazinePct: 0,
  };
  for (const id of Object.values(state.equipped)) {
    const attachment = id ? findAttachment(id) : undefined;
    if (!attachment) continue;
    for (const key of Object.keys(total) as (keyof WeaponModifiers)[]) {
      total[key] += attachment.modifiers[key] ?? 0;
    }
  }
  return total;
}

const factor = (pct: number) => Math.max(0.1, 1 + pct / 100);
const round = (value: number, digits: number) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export function applyUpgrades(weapon: Weapon, state: WeaponUpgradeState | null | undefined): Weapon {
  if (!state) return weapon;
  const mods = equippedModifiers(state);
  const damageBonus = bonusOf(weapon.id, "damage", state.levels.damage);
  const accuracyBonus = bonusOf(weapon.id, "accuracy", state.levels.accuracy);
  const reloadBonus = bonusOf(weapon.id, "reload", state.levels.reload);

  return {
    ...weapon,
    damage: round(weapon.damage * factor(damageBonus) * factor(mods.damagePct), 1),
    fireRate: Math.round(weapon.fireRate * factor(mods.fireRatePct)),
    spreadDegrees: round(weapon.spreadDegrees * factor(-accuracyBonus) * factor(mods.spreadPct), 2),
    recoilDegrees: round(weapon.recoilDegrees * factor(mods.recoilPct), 2),
    reloadSeconds: round(weapon.reloadSeconds * factor(-reloadBonus) * factor(mods.reloadPct), 2),
    magazineSize: Math.max(1, Math.round(weapon.magazineSize * factor(mods.magazinePct))),
  };
}

export interface StatDiff {
  key: "damage" | "fireRate" | "spreadDegrees" | "recoilDegrees" | "reloadSeconds" | "magazineSize";
  label: string;
  unit: string;
  before: number;
  after: number;
  /** Benar bila angka lebih kecil berarti lebih baik. */
  lowerIsBetter: boolean;
}

const DIFF_FIELDS: Omit<StatDiff, "before" | "after">[] = [
  { key: "damage", label: "Kerusakan", unit: "", lowerIsBetter: false },
  { key: "fireRate", label: "Laju tembak", unit: " rpm", lowerIsBetter: false },
  { key: "spreadDegrees", label: "Sebaran", unit: "°", lowerIsBetter: true },
  { key: "recoilDegrees", label: "Sentakan", unit: "°", lowerIsBetter: true },
  { key: "reloadSeconds", label: "Isi ulang", unit: " dtk", lowerIsBetter: true },
  { key: "magazineSize", label: "Magasin", unit: " butir", lowerIsBetter: false },
];

/** Perbandingan statistik dua keadaan senjata, baris demi baris. */
export function diffWeapons(before: Weapon, after: Weapon): StatDiff[] {
  return DIFF_FIELDS.map((field) => ({
    ...field,
    before: before[field.key],
    after: after[field.key],
  }));
}
