/**
 * Musik latar yang mengikuti jalannya pertandingan.
 *
 * Dengung yang sama dari menit pertama sampai peluit akhir cepat berubah
 * menjadi bunyi yang tidak lagi didengar siapa pun. Yang membuatnya berguna
 * bukan melodinya — arena tembak-tembakan tidak butuh lagu yang harus diingat
 * — melainkan PERUBAHANNYA: pemain tahu ronde sudah dimulai, tahu ini ronde
 * penentuan, dan tahu pertandingan sudah usai, tanpa memalingkan pandangan
 * dari bidikannya.
 *
 * Yang berubah hanya empat angka, dan itu disengaja. Dengung yang sama tetap
 * berjalan; ia dibuka lebih terang, sedikit lebih keras, digoyang lebih cepat,
 * dan ditemani satu suara tambahan. Mengganti seluruh musik tiap peralihan
 * akan terdengar seperti lagu yang dipotong, bukan seperti pertandingan yang
 * memanas.
 */

export type MusicPhase =
  | "bersiap"
  | "bertempur"
  | "penentuan"
  | "jeda"
  | "usai";

export interface MusicPhaseVoice {
  /** Batas atas lowpass dengungnya, hertz. Makin tinggi makin tegang. */
  cutoff: number;
  /** Pengali kerasnya lapisan musik, relatif terhadap volume musik pemain. */
  gain: number;
  /** Kerasnya suara tambahan yang menumpuk di atas dengung, 0..1. */
  tension: number;
  /** Kecepatan goyangan lowpass-nya, hertz. */
  lfoRate: number;
  label: string;
}

export const MUSIC_PHASES: Record<MusicPhase, MusicPhaseVoice> = {
  // Sebelum pemain benar-benar masuk: hampir tidak terdengar, hanya menandakan
  // bahwa arenanya hidup.
  bersiap: {
    cutoff: 300,
    gain: 0.65,
    tension: 0,
    lfoRate: 0.04,
    label: "menunggu mulai",
  },
  bertempur: {
    cutoff: 520,
    gain: 1,
    tension: 0.35,
    lfoRate: 0.07,
    label: "ronde berjalan",
  },
  // Ronde terakhir: paling terang, paling cepat bergoyang, suara tambahannya
  // paling tebal. Pemain harus bisa merasakan ini ronde penentuan.
  penentuan: {
    cutoff: 720,
    gain: 1.15,
    tension: 0.7,
    lfoRate: 0.11,
    label: "ronde penentuan",
  },
  // Jeda antar ronde: mengendur, memberi ruang bernapas.
  jeda: {
    cutoff: 250,
    gain: 0.6,
    tension: 0,
    lfoRate: 0.03,
    label: "jeda antar ronde",
  },
  usai: {
    cutoff: 190,
    gain: 0.45,
    tension: 0,
    lfoRate: 0.02,
    label: "pertandingan usai",
  },
};

/**
 * Lama peralihan antar babak, detik.
 *
 * Cukup panjang supaya tidak terdengar sebagai saklar, cukup pendek supaya
 * kabarnya sampai selagi masih berguna: pemain yang baru tahu ronde penentuan
 * sudah dimulai pada detik kesepuluh sudah kehilangan gunanya kabar itu.
 */
export const MUSIC_FADE_SECONDS = 1.4;

export interface RoundShape {
  status: "warmup" | "live" | "intermission" | "ended";
  /** Ronde keberapa yang sedang berjalan. */
  current: number;
  /** Berapa ronde seluruhnya. */
  total: number;
}

/**
 * Babak musik untuk keadaan ronde tertentu.
 *
 * Ronde terakhir mendapat babaknya sendiri. Itu satu-satunya ronde yang tidak
 * bisa disusul ronde lain, dan pemain yang menyadarinya bermain berbeda —
 * musik yang tidak ikut berubah membuat ronde itu terasa persis seperti ronde
 * pertama.
 */
export function musicPhaseFor(round: RoundShape): MusicPhase {
  switch (round.status) {
    case "warmup":
      return "bersiap";
    case "intermission":
      return "jeda";
    case "ended":
      return "usai";
    case "live":
      return round.current >= round.total ? "penentuan" : "bertempur";
  }
}

/** Benar bila peralihan ini menaikkan ketegangan, bukan menurunkannya. */
export function isRising(from: MusicPhase, to: MusicPhase): boolean {
  return MUSIC_PHASES[to].tension > MUSIC_PHASES[from].tension;
}
