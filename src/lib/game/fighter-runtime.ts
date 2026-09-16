/**
 * Penanda waktu tembakan terakhir yang mengenai tiap petarung, dipakai penanda
 * arena untuk mengedipkan badan sesaat setelah kena. Disimpan di luar React
 * karena hanya memengaruhi material di dalam loop render, bukan tampilan DOM.
 */
const lastHitAt = new Map<string, number>();

export function markFighterHit(fighterId: string, at = performance.now() / 1000) {
  lastHitAt.set(fighterId, at);
}

/** Detik sejak petarung terakhir kena tembak, atau Infinity bila belum pernah. */
export function secondsSinceHit(
  fighterId: string,
  now = performance.now() / 1000,
): number {
  const at = lastHitAt.get(fighterId);
  return at === undefined ? Infinity : now - at;
}

/** Dibersihkan saat pertandingan dimulai ulang. */
export function resetFighterHits() {
  lastHitAt.clear();
}
