import type { WeaponType } from "@/types/game";

/**
 * Sentakan senjata saat menembak.
 *
 * Dua hal yang dikerjakan di sini, dan keduanya berangkat dari cacat yang
 * sama-sama terlihat di rekaman arena.
 *
 * PERTAMA, sentakannya adalah DORONGAN yang meluruh tiap frame, bukan fungsi
 * dari "sudah berapa lama sejak tembakan terakhir". Cara yang kedua itu
 * terlihat benar di mesin cepat dan hilang sama sekali di mesin lambat:
 * saat arena menggambar delapan frame per detik sementara senjata menembak
 * sepuluh peluru per detik, hampir tiap frame punya tembakan barunya sendiri,
 * "sudah berapa lama" selalu nol, dan senjata digambar tepat di awal kurva
 * sentakan — yaitu di tempat diamnya. Rentetan penuh karena itu terlihat
 * seperti senjata yang tidak menyentak sama sekali. Sebagai dorongan, tiap
 * tembakan langsung menaikkan simpangannya pada frame itu juga, dan yang
 * bergantung pada frame rate hanya kehalusan luruhnya.
 *
 * KEDUA, tiap tembakan menambah PANAS yang memperbesar dorongan berikutnya
 * dan meluruh sendiri saat pelatuk dilepas. Tanpa itu rentetan tiga puluh
 * peluru terlihat identik dengan satu tembakan yang diulang tiga puluh kali:
 * tidak ada alasan visual untuk melepas pelatuk.
 *
 * Panasnya hanya mengubah TAMPILAN senjata. Sebaran peluru dan sentakan
 * kamera punya perhitungannya sendiri di sistem senjata; menyatukan keduanya
 * di sini akan membuat perubahan rasa animasi diam-diam mengubah akurasi.
 */

export interface RecoilStyle {
  /** Tambahan panas tiap tembakan; kebalikan dari jumlah peluru sampai penuh. */
  perShot: number;
  /** Panas tertinggi yang bisa dicapai. */
  maxHeat: number;
  /**
   * Jeda terpanjang antara dua tembakan yang masih dianggap SATU rentetan,
   * detik. Selama masih di dalamnya, panas ditahan; lewat dari itu ia mulai
   * meluruh.
   */
  linkSeconds: number;
  /** Seberapa cepat panas meluruh sesudah jeda itu terlampaui, per detik. */
  decay: number;
  /** Seberapa besar dorongan tumbuh pada panas penuh, sebagai pengali. */
  climb: number;
  /** Simpangan kiri-kanan acak tiap tembakan, bagian dari sentakan naiknya. */
  wander: number;
}

/*
  Panas ditumpuk PER TEMBAKAN, bukan per detik.

  Itu bukan pilihan rasa, melainkan syarat supaya rentetan terlihat sama di
  mesin cepat dan mesin lambat. Kecepatan tembak sebenarnya dibatasi oleh
  frame rate — arena yang menggambar delapan frame per detik menembakkan
  delapan peluru per detik meski senjatanya sanggup sepuluh. Panas yang naik
  per peluru tetapi meluruh per DETIK karena itu nyaris tidak pernah menumpuk
  di mesin lambat: yang hilang di sela dua frame lebih besar daripada yang
  ditambahkan satu peluru, dan rentetan tiga puluh peluru terlihat sama
  jinaknya dengan tembakan pertama.

  Karena itu panas DITAHAN selama tembakan masih saling berdekatan, dan baru
  meluruh sesudah jedanya melewati `linkSeconds`. `perShot` lalu punya arti
  yang lurus: satu per berapa peluru beruntun sampai panas penuh, berapa pun
  frame rate-nya.

  `linkSeconds` diambil sekitar 2,5 kali jeda tembak senjatanya sendiri,
  dengan batas bawah 0,28 detik. Batas bawah itulah yang menyelamatkan senjata
  cepat di mesin lambat: pada delapan frame per detik jarak antar peluru
  sudah 0,125 detik, dan pada empat frame per detik 0,25 detik — keduanya
  masih terhitung satu rentetan.
*/
export const RECOIL_STYLES: Record<WeaponType, RecoilStyle> = {
  // Penuh dalam 8 peluru dari magasin 12.
  pistol: {
    perShot: 0.125,
    maxHeat: 1,
    linkSeconds: 0.375,
    decay: 1.2,
    climb: 0.7,
    wander: 0.25,
  },
  // Penuh dalam 20 peluru dari magasin 30: menembak paling cepat, jadi
  // panasnya naik paling sedikit per peluru.
  smg: {
    perShot: 0.05,
    maxHeat: 1,
    linkSeconds: 0.28,
    decay: 1.6,
    climb: 0.9,
    wander: 0.35,
  },
  // Penuh dalam 15 peluru dari magasin 30.
  rifle: {
    perShot: 0.067,
    maxHeat: 1,
    linkSeconds: 0.28,
    decay: 1,
    climb: 1.1,
    wander: 0.3,
  },
  // Shotgun dan sniper menembak jarang, jadi rentetannya diikat jauh lebih
  // longgar. Tumbuhnya sengaja kecil: satu tembakan mereka sudah keras sejak
  // peluru pertama.
  shotgun: {
    perShot: 0.167,
    maxHeat: 1,
    linkSeconds: 1.67,
    decay: 0.5,
    climb: 0.35,
    wander: 0.2,
  },
  sniper: {
    perShot: 0.25,
    maxHeat: 1,
    linkSeconds: 3.33,
    decay: 0.5,
    climb: 0.25,
    wander: 0.15,
  },
};

/** Watak sentakan sebuah senjata; jenis tak dikenal memakai senapan serbu. */
export function recoilStyleFor(
  type: WeaponType | null | undefined,
): RecoilStyle {
  if (!type) return RECOIL_STYLES.rifle;
  return RECOIL_STYLES[type] ?? RECOIL_STYLES.rifle;
}

export interface RecoilState {
  /** Simpangan sentakan sekarang; nol berarti senjata di tempatnya. */
  value: number;
  /** Jam halaman saat simpangan itu dicatat, detik. */
  at: number;
  /**
   * Panas rentetan SAAT TEMBAKAN TERAKHIR, 0..maxHeat. Tidak diluruhkan di
   * tempatnya: luruhnya dihitung dari `shotAt` tiap kali panasnya dibaca,
   * supaya menjalankan waktu berkali-kali dalam satu detik tidak meluruhkan
   * panasnya berkali-kali pula.
   */
  heat: number;
  /** Jam tembakan terakhir, detik. */
  shotAt: number;
  /** Nomor tembakan; benih simpangan kiri-kanannya. */
  shot: number;
}

export const RECOIL_REST: RecoilState = {
  value: 0,
  at: 0,
  heat: 0,
  shotAt: -Infinity,
  shot: 0,
};

/**
 * Simpangan sekecil ini dibulatkan ke nol.
 *
 * Luruh eksponensial tidak pernah benar-benar sampai nol, dan senjata yang
 * tertinggal sepersepuluh ribu satuan dari tempatnya akan terus dihitung
 * sepanjang pertandingan. Di bawah ambang ini simpangannya sudah jauh lebih
 * kecil daripada satu piksel di layar.
 */
const AMBANG_DIAM = 1e-3;

/** Berapa lama dorongan meluruh, sebagai bagian dari umur sentakan. */
const LURUH = 3;

function bersih(nilai: number): number {
  return Math.abs(nilai) < AMBANG_DIAM ? 0 : nilai;
}

/**
 * Panas yang tersisa pada suatu saat.
 *
 * Ditahan penuh selama tembakan terakhir masih di dalam `linkSeconds` —
 * rentetannya belum putus — lalu meluruh dari situ.
 */
export function heatAt(
  state: RecoilState,
  now: number,
  style: RecoilStyle,
): number {
  if (!Number.isFinite(now) || state.heat <= 0) return 0;
  const menganggur = now - state.shotAt - style.linkSeconds;
  if (!(menganggur > 0)) return state.heat;
  return Math.max(0, state.heat - menganggur * style.decay);
}

/**
 * Keadaan sentakan sesudah waktu berjalan sampai `now`, tanpa tembakan baru.
 *
 * `seconds` adalah umur sentakan senjatanya; dorongannya meluruh tiga kali
 * lebih cepat dari itu supaya sentakan satu tembakan benar-benar habis dalam
 * umur tersebut, bukan menyisakan ekor yang terlihat.
 */
export function recoilStep(
  state: RecoilState,
  now: number,
  seconds: number,
): RecoilState {
  if (!Number.isFinite(now)) return state;
  const dt = now - state.at;
  if (!(dt > 0)) return state;
  const tau = Math.max(1e-4, seconds) / LURUH;
  return {
    ...state,
    value: bersih(state.value * Math.exp(-dt / tau)),
    at: now,
  };
}

/**
 * Keadaan sentakan sesudah satu tembakan.
 *
 * Waktunya dijalankan DULU sampai saat tembakan ini, baru dorongannya
 * ditambahkan. Urutan itu yang membuat jeda antar tembakan berarti: menahan
 * pelatuk menumpuk panas karena jedanya pendek, sementara menembak sekali
 * setiap beberapa jeda selalu mulai dari tempat yang sama.
 *
 * Dorongannya langsung menaikkan simpangan pada saat itu juga, bukan menunggu
 * frame berikutnya. Itulah yang membuat sentakan tetap terlihat di mesin yang
 * hanya menggambar beberapa frame per detik.
 */
export function recoilShot(
  state: RecoilState,
  now: number,
  seconds: number,
  style: RecoilStyle,
): RecoilState {
  const saat = Number.isFinite(now) ? now : state.at;
  const maju = recoilStep(state, saat, seconds);
  // Panas yang dipakai adalah panas SEBELUM tembakan ini, jadi peluru pertama
  // sebuah rentetan menyentak tepat sebesar yang tertulis di klipnya.
  const dasar = heatAt(state, saat, style);
  return {
    value: Math.min(2, maju.value + heatScale(dasar, style)),
    at: saat,
    heat: Math.min(style.maxHeat, dasar + style.perShot),
    shotAt: saat,
    shot: maju.shot + 1,
  };
}

/**
 * Simpangan acak tapi TETAP untuk sebuah nomor tembakan, -1..1.
 *
 * Dihitung dari nomornya, bukan dari Math.random, supaya rentetan yang sama
 * menghasilkan gerakan yang sama tiap kali — kalau tidak, "apakah sentakannya
 * masuk akal" tidak bisa diperiksa sama sekali, hanya bisa ditonton.
 */
export function shotWander(shot: number): number {
  if (!Number.isFinite(shot)) return 0;
  const x = Math.sin(shot * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Pengali besar dorongan pada panas tertentu. */
export function heatScale(heat: number, style: RecoilStyle): number {
  if (!Number.isFinite(heat) || heat <= 0) return 1;
  const bagian = Math.min(1, heat / style.maxHeat);
  return 1 + bagian * style.climb;
}
