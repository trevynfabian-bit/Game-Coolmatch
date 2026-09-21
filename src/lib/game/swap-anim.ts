import type { Pose } from "@/lib/game/viewmodel-anim";

/**
 * Pergantian senjata: yang lama diturunkan keluar layar, yang baru diangkat
 * masuk.
 *
 * Dua hal diperbaiki di berkas ini, dan yang kedua adalah alasan sebenarnya
 * ia ada.
 *
 * PERTAMA, turun dan naiknya tidak sama lama. Menyimpan senjata lebih cepat
 * daripada mengangkat senjata baru sampai siap tembak — tangan menjatuhkan
 * yang satu lalu mengangkat yang lain, bukan menukar dua benda yang
 * sama-sama berat.
 *
 * KEDUA, dan ini yang penting: senjatanya BERGANTI DI TITIK TERENDAH, saat
 * ia berada di luar pandangan. Sebelumnya pergantian dicatat di akhir
 * animasi, jadi yang turun dan yang naik lagi adalah senjata yang SAMA —
 * senjata lama diangkat kembali utuh ke pandangan, lalu berubah bentuk
 * mendadak di tangan pemain. Yang terlihat bukan mengganti senjata melainkan
 * senjata yang menyulap dirinya sendiri.
 */

/**
 * Bagian waktu pergantian yang dipakai menurunkan senjata lama; sisanya untuk
 * mengangkat yang baru.
 *
 * Dipakai bersama oleh animasinya dan oleh yang benar-benar menukar
 * senjatanya. Satu angka, satu saat: kalau keduanya punya angka sendiri,
 * senjatanya akan berganti saat animasinya belum sampai ke bawah.
 */
export const SWAP_DOWN_SHARE = 0.4;

export interface SwapClip {
  /** Seberapa jauh senjata diturunkan saat berganti. */
  drop: number;
  tilt: number;
}

function halus(t: number): number {
  const p = Math.min(1, Math.max(0, t));
  return p * p * (3 - 2 * p);
}

/**
 * Pose senjata pada suatu kemajuan pergantian 0..1.
 *
 * Kurvanya halus di kedua ujung dan menahan sebentar di dasar, bukan segitiga
 * bersudut tajam: sudut tajam di titik terendah terlihat sebagai sentakan,
 * dan justru di situlah senjatanya bertukar.
 */
export function swapPose(progress: number, clip: SwapClip): Pose {
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  if (p <= 0 || p >= 1) return { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };

  const kuat =
    p < SWAP_DOWN_SHARE
      ? halus(p / SWAP_DOWN_SHARE)
      : halus((1 - p) / (1 - SWAP_DOWN_SHARE));

  return {
    px: 0,
    py: -clip.drop * kuat,
    pz: clip.drop * 0.3 * kuat,
    rx: clip.tilt * kuat,
    ry: 0,
    rz: -clip.tilt * 0.6 * kuat,
  };
}

/** Kemajuan saat senjatanya benar-benar bertukar: titik terendahnya. */
export function swapBottom(): number {
  return SWAP_DOWN_SHARE;
}

/** Jam saat senjatanya bertukar, dihitung dari jam mulai dan lamanya. */
export function swapBottomAt(startedAt: number, seconds: number): number {
  return startedAt + seconds * SWAP_DOWN_SHARE;
}
