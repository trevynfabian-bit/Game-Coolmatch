/**
 * Syarat membuka sebuah senjata, disimpan sebagai ANGKA, bukan kalimat jadi.
 *
 * Sebelumnya kepemilikan senjata membawa tiga hal sekaligus: kalimat syaratnya,
 * kemajuan 0..1, dan label "2 / 5". Ketiganya menggambarkan satu fakta yang
 * sama, jadi ketiganya bisa berselisih — menaikkan target tanpa memperbarui
 * kalimatnya menghasilkan bar yang bergerak sementara tulisannya berbohong. Dan
 * karena semuanya sudah berupa teks, tidak ada yang bisa menghitung apa pun
 * darinya; "tinggal tiga kemenangan lagi" mustahil diturunkan dari "2 / 5".
 */
export type UnlockKind = "wins" | "kills" | "matches";

export interface UnlockRequirement {
  kind: UnlockKind;
  /** Yang sudah terkumpul pemain. */
  current: number;
  /** Yang dibutuhkan untuk membuka. */
  target: number;
}

/** Kata benda untuk tiap jenis syarat, dipakai menyusun kalimatnya. */
const NOUN: Record<UnlockKind, string> = {
  wins: "kemenangan",
  kills: "kill",
  matches: "pertandingan",
};

/** Kalimat perintah untuk tiap jenis syarat. */
const SENTENCE: Record<UnlockKind, (target: number) => string> = {
  wins: (n) => `Menangi ${n} pertandingan`,
  kills: (n) => `Kumpulkan ${n} kill`,
  matches: (n) => `Mainkan ${n} pertandingan`,
};

export interface UnlockFacts {
  /** Kalimat syaratnya, mis. "Menangi 5 pertandingan". */
  label: string;
  /** Kemajuan menuju syarat, 0..1. */
  progress: number;
  /** Bentuk "2 / 5" untuk di samping bar. */
  countText: string;
  /** Sisa yang dibutuhkan; nol berarti syaratnya sudah terpenuhi. */
  remaining: number;
  /**
   * Sisa dalam kalimat, mis. "3 kemenangan lagi". Inilah yang benar-benar
   * dicari pemain: angka "2 / 5" memaksanya mengurangi sendiri, dan pada
   * daftar berisi beberapa senjata, pengurangan itu berulang tiap baris.
   */
  remainingText: string;
}

export function unlockFacts(req: UnlockRequirement): UnlockFacts {
  const target = Math.max(1, req.target);
  const current = Math.max(0, req.current);
  const remaining = Math.max(0, target - current);

  return {
    label: SENTENCE[req.kind](target),
    progress: Math.min(1, current / target),
    countText: `${current} / ${target}`,
    remaining,
    remainingText:
      remaining === 0
        ? "Syarat sudah terpenuhi"
        : `${remaining} ${NOUN[req.kind]} lagi`,
  };
}
