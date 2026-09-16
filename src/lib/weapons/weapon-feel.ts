import { shotInterval } from "@/lib/game/shooting";
import type { Weapon } from "@/types/game";

/**
 * Nyawa penuh seorang petarung tanpa rompi. Dipakai menghitung berapa tembakan
 * yang dibutuhkan untuk menumbangkan lawan.
 */
const FULL_HEALTH = 100;

/** Memilih kata berdasarkan ambang, dari yang terkecil ke terbesar. */
function pickWord(
  value: number,
  steps: { atMost: number; word: string }[],
  fallback: string,
): string {
  for (const step of steps) {
    if (value <= step.atMost) return step.word;
  }
  return fallback;
}

export interface WeaponFeel {
  /** Tembakan ke badan yang dibutuhkan untuk menumbangkan lawan bernyawa penuh. */
  shotsToKill: number;
  /** Tembakan ke kepala yang dibutuhkan. */
  shotsToKillHeadshot: number;
  /** Perkiraan waktu menumbangkan bila semua tembakan kena, dalam detik. */
  timeToKillSeconds: number;
  /** Benar untuk senjata berbutir banyak, yang hitungannya mensyaratkan semua butir kena. */
  needsAllPellets: boolean;
  fireRateWord: string;
  accuracyWord: string;
  controlWord: string;
  reloadWord: string;
  rangeWord: string;
}

/**
 * Menerjemahkan angka mentah senjata menjadi keterangan sehari-hari.
 *
 * Halaman pilih senjata ditujukan untuk pemain, bukan perancang game: "620 rpm"
 * dan "1,3 derajat" tidak berarti apa-apa bagi kebanyakan orang, sedangkan
 * "tiga tembakan untuk menumbangkan" langsung bisa dipakai mengambil keputusan.
 */
export function weaponFeel(weapon: Weapon): WeaponFeel {
  const perShot = weapon.damage * weapon.pellets;
  const shotsToKill = Math.max(1, Math.ceil(FULL_HEALTH / perShot));
  const shotsToKillHeadshot = Math.max(
    1,
    Math.ceil(FULL_HEALTH / (perShot * 2)),
  );

  return {
    shotsToKill,
    shotsToKillHeadshot,
    // Tembakan pertama terjadi di detik nol, jadi yang dihitung hanya jeda
    // di antara tembakan.
    timeToKillSeconds: (shotsToKill - 1) * shotInterval(weapon),
    needsAllPellets: weapon.pellets > 1,

    fireRateWord: pickWord(
      weapon.fireRate,
      [
        { atMost: 120, word: "Sangat lambat" },
        { atMost: 320, word: "Lambat" },
        { atMost: 520, word: "Sedang" },
        { atMost: 780, word: "Cepat" },
      ],
      "Sangat cepat",
    ),

    accuracyWord: pickWord(
      weapon.spreadDegrees,
      [
        { atMost: 0.5, word: "Sangat tajam" },
        { atMost: 1.5, word: "Tajam" },
        { atMost: 2.5, word: "Cukup akurat" },
        { atMost: 4, word: "Menyebar" },
      ],
      "Sangat menyebar",
    ),

    controlWord: pickWord(
      weapon.recoilDegrees,
      [
        { atMost: 0.6, word: "Sangat jinak" },
        { atMost: 1, word: "Jinak" },
        { atMost: 2, word: "Agak melonjak" },
        { atMost: 3, word: "Melonjak" },
      ],
      "Melonjak keras",
    ),

    reloadWord: pickWord(
      weapon.reloadSeconds,
      [
        { atMost: 1.5, word: "Kilat" },
        { atMost: 2.2, word: "Cepat" },
        { atMost: 3, word: "Sedang" },
      ],
      "Lama",
    ),

    rangeWord: rangeWordFor(weapon),
  };
}

/** Jarak main yang paling masuk akal untuk tiap jenis senjata. */
function rangeWordFor(weapon: Weapon): string {
  switch (weapon.type) {
    case "sniper":
      return "Jarak jauh";
    case "shotgun":
      return "Jarak dekat";
    case "rifle":
      return "Segala jarak";
    case "smg":
    case "pistol":
      return "Dekat sampai menengah";
  }
}

/** Kalimat ringkas "berapa tembakan untuk menumbangkan". */
export function killSummary(feel: WeaponFeel): string {
  const shots =
    feel.shotsToKill === 1
      ? "Sekali tembak menumbangkan"
      : `${feel.shotsToKill} tembakan untuk menumbangkan`;

  if (feel.needsAllPellets) {
    return `${shots}, bila semua butir kena`;
  }
  if (feel.shotsToKill === 1) return shots;
  return `${shots} (sekitar ${feel.timeToKillSeconds.toFixed(2)} detik)`;
}
