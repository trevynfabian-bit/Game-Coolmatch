/**
 * Statistik tembakan pemain dalam satu sesi (pertandingan atau uji coba):
 * butir dilepas, kena, kena kepala, dan kerusakan. Ditulis sistem senjata,
 * dibaca layar akhir. Di luar React karena berubah tiap tembakan.
 */
export const sessionStats = {
  shots: 0,
  hits: 0,
  headshots: 0,
  damage: 0,
  /** Senjata yang paling banyak dipakai menembak, id → butir. */
  byWeapon: {} as Record<string, number>,
};

export function resetSessionStats(): void {
  sessionStats.shots = 0;
  sessionStats.hits = 0;
  sessionStats.headshots = 0;
  sessionStats.damage = 0;
  sessionStats.byWeapon = {};
}
