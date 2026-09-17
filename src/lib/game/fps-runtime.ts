/**
 * Penghitung frame, disimpan di luar React.
 *
 * Nilainya berubah tiap frame — enam puluh kali per detik — dan membuat React
 * merender ulang sesering itu justru MENURUNKAN angka yang sedang diukurnya.
 * Karena itu hitungannya dikumpulkan di sini, dan hanya rata-rata per detik
 * yang dikirim ke store untuk ditampilkan.
 */
let frames = 0;
let elapsed = 0;
let latest = 0;

/** Dipanggil tiap frame; mengembalikan angka baru saat satu detik penuh lewat. */
export function tickFps(delta: number): number | null {
  frames += 1;
  elapsed += delta;
  if (elapsed < 1) return null;

  latest = Math.round(frames / elapsed);
  frames = 0;
  elapsed = 0;
  return latest;
}

export function resetFps() {
  frames = 0;
  elapsed = 0;
  latest = 0;
}

export function getFps(): number {
  return latest;
}
