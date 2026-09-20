import {
  ARMOR_ABSORPTION,
  HEADSHOT_MULTIPLIER,
  RESPAWN_SECONDS,
  STARTING_ARMOR,
} from "@/lib/game/damage";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";

/**
 * Aturan nyawa, rompi, dan respawn yang berlaku dalam satu ronde.
 *
 * Satu bentuk untuk dua sisi: server menyajikannya bersama sesi supaya arena
 * memakai aturan yang sama dengan yang dipakai server menilai laporan, dan
 * arena membacanya dari sesi alih-alih dari tetapan yang tersebar. Angkanya
 * masih tetap — turunan dari tetapan kerusakan dan katalog senjata — jadi
 * hari ini keduanya pasti sama; bentuknya yang membuat itu tetap benar
 * ketika nanti aturan bisa berbeda per pertandingan.
 */
export interface RoundRules {
  /** Nyawa penuh setiap petarung saat ronde dimulai dan saat muncul kembali. */
  maxHealth: number;
  /** Rompi yang diberikan saat ronde dimulai; tidak pulih saat muncul kembali. */
  armorPerRound: number;
  /** Bagian kerusakan yang ditahan rompi selama rompi masih ada, 0..1. */
  armorAbsorption: number;
  /** Lama menunggu sebelum muncul kembali, dalam detik. */
  respawnSeconds: number;
  /** Pengali kerusakan untuk tembakan yang mengenai kepala. */
  headshotMultiplier: number;
  /** Kerusakan satu peluru yang paling besar yang masih masuk akal. */
  maxHitDamage: number;
}

/** Kerusakan satu peluru terbesar di katalog senjata, sebelum pengali kepala. */
const MAX_WEAPON_DAMAGE = Math.max(
  ...MOCK_WEAPONS.map((weapon) => weapon.damage),
);

export const DEFAULT_ROUND_RULES: RoundRules = {
  maxHealth: 100,
  armorPerRound: STARTING_ARMOR,
  armorAbsorption: ARMOR_ABSORPTION,
  respawnSeconds: RESPAWN_SECONDS,
  headshotMultiplier: HEADSHOT_MULTIPLIER,
  maxHitDamage: MAX_WEAPON_DAMAGE * HEADSHOT_MULTIPLIER,
};

/**
 * Nyawa penuh dan rompi seorang petarung saat ronde dimulai, menurut aturan.
 */
export function roundStartVitals(rules: RoundRules): {
  health: number;
  armor: number;
} {
  return { health: rules.maxHealth, armor: rules.armorPerRound };
}

/** Nyawa dan rompi saat muncul kembali: nyawa penuh, rompi tidak pulih. */
export function respawnVitals(rules: RoundRules): {
  health: number;
  armor: number;
} {
  return { health: rules.maxHealth, armor: 0 };
}

/**
 * Benar bila kerusakan satu peluru masih di dalam aturan: bilangan bulat
 * positif yang tidak melampaui peluru terkuat yang mengenai kepala.
 */
export function isPlausibleHitDamage(
  rules: RoundRules,
  damage: number,
): boolean {
  return Number.isInteger(damage) && damage > 0 && damage <= rules.maxHitDamage;
}
