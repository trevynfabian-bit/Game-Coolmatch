/**
 * Jam ronde yang presisi, disimpan di luar React.
 *
 * Store hanya menyimpan detik bulat supaya HUD render ulang sekali per detik.
 * Nilai pecahannya hidup di sini dan dikurangi tiap frame oleh RoundTicker.
 */
let remaining = 0;

export function setRoundClock(seconds: number) {
  remaining = seconds;
}

export function tickRoundClock(delta: number): number {
  remaining = Math.max(0, remaining - delta);
  return remaining;
}

export function getRoundClock(): number {
  return remaining;
}
