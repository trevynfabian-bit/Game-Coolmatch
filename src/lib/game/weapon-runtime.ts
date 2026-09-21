/**
 * Jam senjata yang berubah tiap frame: kapan isi ulang selesai, dan kapan
 * pergantian senjata selesai.
 *
 * Disimpan sebagai objek biasa di luar React, sama seperti keadaan gerak
 * pemain. Alasannya bukan sekadar menghindari render ulang, melainkan
 * memastikan hanya ADA SATU jam untuk tiap kejadian: animasi senjata yang
 * menghitung sendiri kapan isi ulang berakhir pasti berselisih dengan jam
 * yang benar-benar membuka pelatuk, dan yang terlihat pemain adalah senjata
 * yang sudah terangkat padahal masih terkunci.
 *
 * Sistem senjata dan tukar senjata yang menulis; penggambar hanya membaca.
 */
export const weaponRuntime: {
  /** Jam halaman saat isi ulang berakhir, detik; nol berarti tidak mengisi. */
  reloadEndsAt: number;
  /** Lama isi ulang yang sedang berjalan, detik. */
  reloadSeconds: number;
  /** Jam halaman saat pergantian senjata berakhir, detik. */
  swapEndsAt: number;
  /** Lama pergantian yang sedang berjalan, detik. */
  swapSeconds: number;
} = {
  reloadEndsAt: 0,
  reloadSeconds: 0,
  swapEndsAt: 0,
  swapSeconds: 0,
};

/** Kemajuan sebuah kejadian berjam 0..1, atau null bila tidak sedang berjalan. */
export function runtimeProgress(
  endsAt: number,
  seconds: number,
  now: number,
): number | null {
  if (seconds <= 0 || endsAt <= 0) return null;
  const sisa = endsAt - now;
  if (sisa <= 0 || sisa > seconds) return null;
  return 1 - sisa / seconds;
}

/** Menyetel ulang kedua jam; dipanggil saat pertandingan disusun ulang. */
export function resetWeaponRuntime() {
  weaponRuntime.reloadEndsAt = 0;
  weaponRuntime.reloadSeconds = 0;
  weaponRuntime.swapEndsAt = 0;
  weaponRuntime.swapSeconds = 0;
}
