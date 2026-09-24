/**
 * Aturan ronde yang sah, dipakai bersama klien dan server.
 *
 * Pertandingan biasa selalu memakai aturan `standar` — server menolak aturan
 * lain untuk pertandingan berkoin, supaya pertandingan super pendek (mis.
 * batas skor 1) tidak bisa dipakai memanen bonus menang. Uji coba senjata
 * memakai aturan kilatnya sendiri dan memang tidak pernah memberi koin.
 */
export interface RoundRules {
  totalRounds: number;
  roundSeconds: number;
  /** Kill dalam satu ronde yang langsung mengakhiri ronde itu. */
  scoreLimit: number;
}

export type MatchMode = "standar" | "uji_coba";

export const MATCH_RULES: Record<MatchMode, RoundRules> = {
  standar: { totalRounds: 5, roundSeconds: 180, scoreLimit: 15 },
  uji_coba: { totalRounds: 1, roundSeconds: 60, scoreLimit: 10 },
};

/** Jeda antarronde, detik. */
export const INTERMISSION_SECONDS = 6;

export function sameRules(a: RoundRules, b: RoundRules): boolean {
  return a.totalRounds === b.totalRounds && a.roundSeconds === b.roundSeconds && a.scoreLimit === b.scoreLimit;
}
