/**
 * Angka kerusakan yang melayang di dekat crosshair.
 *
 * Angka yang selalu tampil sama besar mengabarkan lebih sedikit daripada yang
 * bisa: serempetan dua belas dan tembakan sniper seratus sepuluh terlihat
 * persis sama, padahal keduanya keputusan yang berbeda — yang pertama berarti
 * "tetap di sini", yang kedua berarti "dia hampir tumbang". Ukuran dan
 * umurnya karena itu mengikuti besarnya.
 *
 * Hal kedua yang dikerjakan berkas ini adalah MENGGABUNGKAN. Satu tarikan
 * pelatuk shotgun mengenai sampai delapan kali dalam satu frame, dan delapan
 * angka kecil yang muncul bersamaan justru lebih sulit dibaca daripada satu
 * angka besar — pemain hanya ingin tahu total yang barusan masuk.
 */

/** Nyawa penuh seorang petarung; dipakai menakar besar kecilnya kerusakan. */
const FULL_HEALTH = 100;

/** Jendela penggabungan angka berurutan, milidetik. */
export const POP_MERGE_MS = 200;

/** Batas ukuran dan umur angka. */
export const POP_SCALE_MIN = 0.85;
export const POP_SCALE_MAX = 1.75;
export const POP_MS_MIN = 700;
export const POP_MS_MAX = 1150;

/**
 * Ukuran angka menurut besarnya kerusakan, sebagai pengali ukuran huruf.
 *
 * Tidak linear: bedanya paling terasa di bawah sepertiga nyawa, tempat
 * sebagian besar tembakan berada. Di atas itu angkanya sudah cukup besar
 * untuk menarik mata, dan membesarkannya terus hanya menutupi layar.
 */
export function popScale(amount: number): number {
  const a = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const bagian = Math.min(1, a / FULL_HEALTH);
  const lengkung = Math.sqrt(bagian);
  return POP_SCALE_MIN + (POP_SCALE_MAX - POP_SCALE_MIN) * lengkung;
}

/** Angka yang lebih besar bertahan sedikit lebih lama supaya sempat dibaca. */
export function popMs(amount: number): number {
  const a = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const bagian = Math.min(1, a / FULL_HEALTH);
  return Math.round(POP_MS_MIN + (POP_MS_MAX - POP_MS_MIN) * bagian);
}

export interface DamagePopShape {
  id: number;
  amount: number;
  isHeadshot: boolean;
  isLethal: boolean;
  /** Kerusakan yang ditahan rompi, bagian dari `amount`. */
  armorPart: number;
  offsetX: number;
  offsetY: number;
  /** Jam saat angka ini terakhir bertambah, milidetik. */
  at: number;
  /**
   * Naik tiap kali angkanya bertambah. Komponen memakainya untuk memulai
   * ulang animasinya, sehingga penambahan benar-benar terlihat sebagai
   * "kena lagi" alih-alih angka yang diam-diam berubah.
   */
  bump: number;
}

export interface IncomingPop {
  amount: number;
  isHeadshot: boolean;
  isLethal: boolean;
  armorPart?: number;
}

/**
 * Menyatukan kerusakan baru ke dalam daftar angka yang sedang tampil.
 *
 * Kerusakan yang datang dalam jendela penggabungan MENAMBAH angka terakhir
 * alih-alih membuat angka baru — itulah yang membuat satu tembakan shotgun
 * terbaca sebagai satu angka besar. Penanda kepala dan tumbang ikut naik bila
 * salah satu butirnya memenuhinya: kabar terpenting tidak boleh hilang hanya
 * karena butir yang lain lebih dulu tercatat.
 */
export function mergePop(
  pops: readonly DamagePopShape[],
  incoming: IncomingPop,
  now: number,
  limit: number,
  random: () => number = Math.random,
): DamagePopShape[] {
  const jumlah = Math.max(0, Math.round(incoming.amount));
  const terakhir = pops[pops.length - 1];

  if (
    terakhir &&
    now >= terakhir.at &&
    now - terakhir.at < POP_MERGE_MS &&
    !terakhir.isLethal
  ) {
    const digabung: DamagePopShape = {
      ...terakhir,
      amount: terakhir.amount + jumlah,
      isHeadshot: terakhir.isHeadshot || incoming.isHeadshot,
      isLethal: terakhir.isLethal || incoming.isLethal,
      armorPart: terakhir.armorPart + Math.max(0, incoming.armorPart ?? 0),
      at: now,
      bump: terakhir.bump + 1,
    };
    return [...pops.slice(0, -1), digabung];
  }

  const baru: DamagePopShape = {
    id: now + random(),
    amount: jumlah,
    isHeadshot: incoming.isHeadshot,
    isLethal: incoming.isLethal,
    armorPart: Math.max(0, incoming.armorPart ?? 0),
    offsetX: (random() - 0.5) * 70,
    offsetY: (random() - 0.5) * 26,
    at: now,
    bump: 0,
  };
  return [...pops.slice(-(limit - 1)), baru];
}

/**
 * Benar bila sebagian besar kerusakan ini ditahan rompi — angkanya ditampilkan
 * lebih redup, sebab nyawa lawan hampir tidak berkurang.
 */
export function mostlyArmor(pop: DamagePopShape): boolean {
  return pop.armorPart > 0 && pop.armorPart >= pop.amount / 2;
}
