/**
 * Penanda kena di sekitar crosshair.
 *
 * Satu-satunya umpan balik yang selalu berada tepat di tempat mata pemain
 * sedang menatap. Karena itu ia harus menjawab lebih dari "kena": apakah kena
 * kepala, apakah tertahan rompi, dan apakah lawannya tumbang. Pemain yang
 * hanya melihat tanda yang sama untuk semuanya tetap harus mengalihkan
 * pandangan ke papan skor atau ke bar nyawa lawan — dan mengalihkan pandangan
 * di tengah baku tembak adalah harga yang mahal.
 *
 * Bentuk dan peringkatnya ditaruh di sini, terpisah dari komponennya, supaya
 * urutan kepentingannya bisa diperiksa tanpa browser.
 */

export type HitMarkerKind = "rompi" | "badan" | "kepala" | "eliminasi";

export interface HitMarkerStyle {
  /** Warna goresnya. */
  color: string;
  /** Jarak pangkal gores dari titik tengah, piksel. */
  gap: number;
  /** Panjang tiap gores, piksel. */
  arm: number;
  /** Tebal gores, piksel. */
  stroke: number;
  /** Lama tampil, milidetik. */
  ms: number;
  /** Putaran seluruh tanda, derajat. */
  rotate: number;
  label: string;
}

export const HIT_MARKER: Record<HitMarkerKind, HitMarkerStyle> = {
  // Tertahan rompi: paling kecil dan paling redup. Kabarnya memang "belum
  // banyak yang terjadi".
  rompi: {
    color: "#93c5fd",
    gap: 4,
    arm: 4,
    stroke: 1.5,
    ms: 260,
    rotate: 0,
    label: "kena rompi",
  },
  badan: {
    color: "#f8fafc",
    gap: 5,
    arm: 5,
    stroke: 2,
    ms: 340,
    rotate: 0,
    label: "kena badan",
  },
  // Kepala: lebih panjang, lebih tebal, dan berwarna — cukup berbeda untuk
  // dikenali dari sudut mata.
  kepala: {
    color: "#fbbf24",
    gap: 5,
    arm: 7,
    stroke: 2.5,
    ms: 420,
    rotate: 0,
    label: "kena kepala",
  },
  // Eliminasi: diputar empat puluh lima derajat sehingga membentuk tanda
  // tambah, bukan silang. Bentuk yang berbeda terbaca lebih cepat daripada
  // warna yang berbeda, dan inilah kabar yang paling menentukan.
  eliminasi: {
    color: "#fda4af",
    gap: 5,
    arm: 9,
    stroke: 3,
    ms: 520,
    rotate: 45,
    label: "lawan tumbang",
  },
};

/** Urutan kepentingan; yang lebih tinggi menimpa yang lebih rendah. */
export const MARKER_RANK: Record<HitMarkerKind, number> = {
  rompi: 1,
  badan: 2,
  kepala: 3,
  eliminasi: 4,
};

export interface HitFacts {
  isHeadshot: boolean;
  /** Rompi yang terkikis tembakan ini. */
  armorLost: number;
  /** Nyawa yang hilang tembakan ini. */
  healthLost: number;
  /** Benar bila tembakan ini yang menumbangkannya. */
  isLethal: boolean;
}

/**
 * Penanda mana yang pantas untuk sebuah tembakan yang kena.
 *
 * Eliminasi mengalahkan segalanya: begitu lawan tumbang, "kena kepala" bukan
 * lagi kabar yang berguna — yang berguna adalah bahwa pemain boleh berpindah
 * sasaran. Aturan sisanya sama dengan nada kena, supaya mata dan telinga
 * tidak pernah mengabarkan dua hal yang berbeda tentang peluru yang sama.
 */
export function markerFor(facts: HitFacts): HitMarkerKind {
  if (facts.isLethal) return "eliminasi";
  if (facts.isHeadshot) return "kepala";
  if (facts.armorLost > 0 && facts.armorLost >= facts.healthLost) {
    return "rompi";
  }
  return "badan";
}

/**
 * Jendela penggabungan penanda, milidetik.
 *
 * Satu tarikan pelatuk shotgun mengenai sampai delapan kali dalam satu frame.
 * Tanpa jendela ini, penanda yang tampil adalah butir TERAKHIR yang kebetulan
 * dihitung — bukan yang paling penting — sehingga tembakan kepala yang
 * mematikan bisa berakhir sebagai tanda "kena rompi".
 */
export const MARKER_WINDOW_MS = 120;

export interface MarkerState {
  kind: HitMarkerKind;
  /** Jam saat penanda ini dipasang, milidetik. */
  at: number;
}

/**
 * Benar bila penanda baru berhak menggantikan yang sedang tampil: selalu
 * boleh bila jendelanya sudah lewat, dan di dalam jendela hanya bila kabarnya
 * lebih penting.
 */
export function markerWins(
  current: MarkerState | null,
  next: HitMarkerKind,
  now: number,
): boolean {
  if (current === null) return true;
  if (now < current.at) return true;
  if (now - current.at >= MARKER_WINDOW_MS) return true;
  return MARKER_RANK[next] > MARKER_RANK[current.kind];
}
