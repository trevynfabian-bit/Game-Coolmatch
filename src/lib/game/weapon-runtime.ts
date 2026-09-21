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

/**
 * Sudah berapa detik sebuah kejadian berjam berjalan, atau null bila tidak
 * sedang berjalan.
 *
 * Dipakai animasi isi ulang, yang tahap turun dan naiknya diukur dalam detik
 * sungguhan: pistol dan sniper menurunkan senjatanya sama cepat, yang berbeda
 * hanya lama pekerjaan di bawah sana.
 */
export function runtimeElapsed(
  endsAt: number,
  seconds: number,
  now: number,
): number | null {
  const kemajuan = runtimeProgress(endsAt, seconds, now);
  return kemajuan === null ? null : kemajuan * seconds;
}

/**
 * Menghentikan jam isi ulang di tempat.
 *
 * Isi ulang bisa BATAL di tengah jalan: pemain berganti senjata, mati, atau
 * ronde berganti — ketiganya mengisi penuh senjatanya dan membatalkan isi
 * ulang yang sedang berjalan. Jamnya harus ikut berhenti di situ juga, kalau
 * tidak senjata tetap tertahan di bawah sampai isi ulang yang sudah dibatalkan
 * itu "selesai", dan pemain memegang senjata siap tembak yang tidak kelihatan.
 */
export function cancelWeaponReload() {
  weaponRuntime.reloadEndsAt = 0;
  weaponRuntime.reloadSeconds = 0;
}

/**
 * Selisih sekecil ini dianggap isi ulang yang memang sudah habis waktunya,
 * bukan pembatalan. Jam frame dan jam store tidak pernah jatuh di
 * mikrodetik yang sama persis.
 */
const TOLERANSI_SELESAI = 0.02;

export type ReloadClockEvent = "mulai" | "batal" | "selesai" | "abai";

/**
 * Menyelaraskan jam isi ulang dengan keadaan store, dan mengabarkan APA yang
 * baru saja terjadi.
 *
 * Ditaruh di sini, bukan di komponen senjata, karena yang membatalkan isi
 * ulang ada di tiga tempat yang tidak saling kenal: ganti senjata, pemain
 * muncul kembali, dan ronde baru — ketiganya mengisi penuh senjata lewat
 * store. Yang tahu isi ulang sudah berhenti hanyalah store itu sendiri, jadi
 * satu aturan yang membaca perubahannya lebih aman daripada tiga pembersihan
 * yang harus diingat satu per satu; pembatalan keempat nanti sudah tertangani
 * sejak sekarang.
 *
 * Bedanya "batal" dan "selesai" bukan soal rapi-rapian: isi ulang yang
 * selesai berakhir dengan ketukan magasin terkunci dan bunyinya boleh habis
 * sendiri, sedangkan isi ulang yang batal harus ikut berhenti terdengar — di
 * senjata yang bahkan mungkin sudah bukan itu lagi.
 */
export function trackReloadClock(
  isReloading: boolean,
  wasReloading: boolean,
  reloadSeconds: number,
  now: number,
): ReloadClockEvent {
  if (isReloading && !wasReloading) {
    weaponRuntime.reloadEndsAt = now + reloadSeconds;
    weaponRuntime.reloadSeconds = reloadSeconds;
    return "mulai";
  }

  if (!isReloading && wasReloading) {
    const sisa = weaponRuntime.reloadEndsAt - now;
    cancelWeaponReload();
    return sisa > TOLERANSI_SELESAI ? "batal" : "selesai";
  }

  return "abai";
}

/** Menyetel ulang kedua jam; dipanggil saat pertandingan disusun ulang. */
export function resetWeaponRuntime() {
  weaponRuntime.reloadEndsAt = 0;
  weaponRuntime.reloadSeconds = 0;
  weaponRuntime.swapEndsAt = 0;
  weaponRuntime.swapSeconds = 0;
}
