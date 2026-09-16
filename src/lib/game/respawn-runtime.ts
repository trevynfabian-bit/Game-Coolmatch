/**
 * Sisa hitung mundur respawn yang presisi, disimpan di luar React.
 *
 * Store hanya menyimpan detik bulat untuk ditampilkan, supaya HUD cukup render
 * ulang sekali per detik alih-alih tiap frame. Nilai pecahan yang sebenarnya
 * hidup di sini dan dikurangi tiap frame oleh RespawnTicker.
 */
const remaining = new Map<string, number>();

/** Memulai hitung mundur bila petarung ini belum punya. */
export function ensureRespawnTimer(fighterId: string, seconds: number) {
  if (!remaining.has(fighterId)) remaining.set(fighterId, seconds);
}

/** Mengurangi hitung mundur dan mengembalikan sisanya. */
export function tickRespawnTimer(fighterId: string, delta: number): number {
  const next = (remaining.get(fighterId) ?? 0) - delta;
  remaining.set(fighterId, next);
  return next;
}

export function clearRespawnTimer(fighterId: string) {
  remaining.delete(fighterId);
}

export function resetRespawnTimers() {
  remaining.clear();
}
