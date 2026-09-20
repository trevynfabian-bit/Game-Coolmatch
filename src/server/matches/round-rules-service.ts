import {
  DEFAULT_ROUND_RULES,
  isPlausibleHitDamage,
  type RoundRules,
} from "@/lib/game/round-rules";

/**
 * Aturan yang berlaku untuk SATU sesi pertandingan: aturan nyawa, rompi, dan
 * respawn, digabung dengan aturan panjang pertandingan yang tersimpan di
 * baris pertandingannya. Server menyajikannya bersama sesi dan memakainya
 * sendiri untuk menilai laporan — satu sumber untuk kedua sisi.
 */
export interface SessionRules extends RoundRules {
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
}

export function sessionRulesFor(match: {
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
}): SessionRules {
  return {
    ...DEFAULT_ROUND_RULES,
    totalRounds: match.totalRounds,
    scoreLimit: match.scoreLimit,
    roundSeconds: match.roundSeconds,
  };
}

/** Kerusakan satu peluru yang diterima endpoint lapor hit, menurut aturan. */
export function hitDamageAllowed(rules: RoundRules, damage: number): boolean {
  return isPlausibleHitDamage(rules, damage);
}
