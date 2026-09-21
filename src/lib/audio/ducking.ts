/**
 * Peredaman latar saat bunyi tempur datang.
 *
 * Latar arena dan musik dibuat untuk mengisi kesunyian, bukan untuk bersaing
 * dengan tembakan. Begitu baku tembak dimulai, keduanya justru menjadi kabut
 * yang menutupi bunyi yang benar-benar dibutuhkan pemain: denting kena, langkah
 * lawan, dan letupan dari arah yang belum terlihat.
 *
 * Jalan keluarnya bukan mengecilkan latar selamanya — arena yang senyap terasa
 * mati saat tidak ada yang menembak. Latar cukup MENYINGKIR sebentar tiap kali
 * ada bunyi tempur, lalu kembali sendiri. Pemain tidak pernah menyadarinya
 * terjadi; yang ia sadari hanyalah bahwa ia bisa mendengar.
 */

/** Bunyi tempur apa yang menyebabkan peredaman. */
export type DuckSource = "tembakan" | "kena" | "eliminasi";

export interface DuckShape {
  /**
   * Seberapa banyak latar yang tersisa saat diredam, 0..1. Angka kecil berarti
   * peredaman dalam.
   */
  level: number;
  /** Lama turunnya, detik. Harus cepat: peredaman yang lamban selalu telat. */
  attack: number;
  /** Lama ditahan di bawah sebelum naik lagi, detik. */
  hold: number;
  /** Lama naiknya kembali, detik. Lebih lambat supaya tidak terdengar memompa. */
  release: number;
}

export const DUCK_SHAPES: Record<DuckSource, DuckShape> = {
  // Tembakan paling sering terjadi, jadi peredamannya paling dangkal dan
  // paling singkat. Peredaman dalam pada tiap peluru senapan serbu akan
  // membuat latar terdengar memompa mengikuti laju tembak.
  tembakan: { level: 0.45, attack: 0.02, hold: 0.09, release: 0.35 },
  // Denting kena lebih penting dan lebih jarang: latar boleh menyingkir lebih
  // jauh untuknya.
  kena: { level: 0.3, attack: 0.015, hold: 0.14, release: 0.4 },
  // Eliminasi adalah kabar terpenting di seluruh permainan. Latar menyingkir
  // paling dalam dan paling lama, lalu kembali perlahan.
  eliminasi: { level: 0.15, attack: 0.015, hold: 0.45, release: 0.8 },
};

export interface DuckState {
  /** Sisa latar yang sedang berlaku, 0..1. */
  level: number;
  /** Sampai kapan peredaman ini ditahan, pada jam konteks audio. */
  until: number;
  /** Lama naik kembali yang berlaku saat tahanan berakhir. */
  release: number;
}

/**
 * Menggabungkan peredaman baru dengan yang sedang berjalan.
 *
 * Yang paling DALAM menang, dan tahanan yang paling PANJANG menang. Itu
 * membuat rentetan tembakan yang disusul satu eliminasi tidak pernah
 * mengangkat latar kembali di tengah kabar terpentingnya — sementara
 * tembakan beruntun hanya memperpanjang peredaman yang sama alih-alih
 * menghentak ulang, yang justru terdengar sebagai pompa.
 */
export function mergeDuck(
  state: DuckState | null,
  shape: DuckShape,
  now: number,
): DuckState {
  const baru: DuckState = {
    level: shape.level,
    until: now + shape.attack + shape.hold,
    release: shape.release,
  };
  // Peredaman lama yang tahanannya sudah lewat tidak ikut diperhitungkan.
  if (state === null || now >= state.until || now < state.until - 5) {
    return baru;
  }
  return {
    level: Math.min(state.level, baru.level),
    until: Math.max(state.until, baru.until),
    release: Math.max(state.release, baru.release),
  };
}

/** Peredaman untuk sebuah sumber bunyi tempur. */
export function duckFor(source: DuckSource): DuckShape {
  return DUCK_SHAPES[source];
}
