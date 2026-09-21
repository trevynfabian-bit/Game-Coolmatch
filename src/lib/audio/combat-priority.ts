import type { EliminationKind } from "@/lib/audio/elimination-voice";
import type { HitKind } from "@/lib/audio/hit-voice";

/**
 * Prioritas bunyi kena dan eliminasi: siapa yang berhak berbunyi ketika
 * beberapa kabar datang dalam sekejap yang sama.
 *
 * Satu tarikan pelatuk shotgun melepas delapan butir, dan tiap butir yang kena
 * memanggil nada kena sendiri-sendiri. Delapan denting yang menumpuk dalam satu
 * frame tidak terdengar sebagai delapan kabar, melainkan sebagai satu bunyi
 * pecah yang mengaburkan semuanya — termasuk mengaburkan bahwa salah satunya
 * mengenai kepala. Hal yang sama terjadi pada tembakan yang mematikan: nada
 * eliminasi dan denting kena berbunyi di saat yang sama persis, dan yang
 * terdengar justru bukan kabar terpentingnya.
 *
 * Aturannya sederhana: dalam satu jendela pendek hanya kabar TERPENTING yang
 * berbunyi. Kabar yang lebih rendah dari yang sudah terdengar dibuang, dan
 * kabar yang lebih tinggi tetap lewat — jadi butir shotgun yang mengenai
 * kepala tetap terdengar sebagai tembakan kepala meski didahului enam butir
 * biasa.
 *
 * Bunyi yang datang KE pemain punya jalurnya sendiri. Kena tembak saat sedang
 * menembak orang adalah dua kabar yang berbeda, dan yang satu tidak boleh
 * membungkam yang lain: justru di saat itulah pemain paling perlu tahu
 * keduanya.
 */

/** Jalur kabar: yang keluar dari pemain, dan yang datang kepadanya. */
export type CueLane = "keluar" | "masuk";

export interface CombatCue {
  lane: CueLane;
  /** Makin tinggi makin penting; hanya yang lebih tinggi menembus jendela. */
  rank: number;
  /**
   * Benar untuk kabar yang selalu berbunyi. Eliminasi tidak pernah dibuang:
   * ia jarang, menentukan, dan justru kabar itulah yang paling sering
   * tertimbun di saat paling ribut.
   */
  always: boolean;
  label: string;
}

/**
 * Lama jendela penggabungan, detik.
 *
 * Cukup panjang untuk menampung seluruh butir satu tembakan shotgun yang
 * berangkat dalam satu frame, dan cukup pendek untuk tidak menelan tembakan
 * berikutnya: senjata tercepat menembak tiap 0,067 detik, tetapi dua peluru
 * SMG yang kena beruntun memang lebih baik terdengar sebagai satu denting
 * daripada dua yang saling menimpa.
 */
export const CUE_WINDOW = 0.12;

const HIT_RANK: Record<HitKind, number> = {
  rompi: 1,
  badan: 2,
  kepala: 3,
};

/** Kabar untuk tembakan pemain yang mengenai lawan. */
export function hitCue(kind: HitKind): CombatCue {
  return {
    lane: "keluar",
    rank: HIT_RANK[kind],
    always: false,
    label: `kena ${kind}`,
  };
}

/** Kabar eliminasi; jalurnya mengikuti siapa yang tumbang. */
export function eliminationCue(kind: EliminationKind): CombatCue {
  return {
    lane: kind === "sendiri" ? "masuk" : "keluar",
    rank: 9,
    always: true,
    label: `eliminasi ${kind}`,
  };
}

/**
 * Kabar untuk pemain yang kena tembak. Peringkatnya mengikuti besar lukanya,
 * jadi tembakan yang jauh lebih menyakitkan tetap terdengar meski datang
 * beruntun di belakang serempetan.
 */
export function takenCue(severity: number): CombatCue {
  const s = Number.isFinite(severity) ? Math.min(1, Math.max(0, severity)) : 0;
  return {
    lane: "masuk",
    rank: 1 + Math.floor(s * 3),
    always: false,
    label: "kena tembak",
  };
}

export interface LaneState {
  /** Kapan kabar terakhir di jalur ini berbunyi, pada jam konteks audio. */
  at: number;
  /** Peringkat kabar terakhir itu. */
  rank: number;
}

/**
 * Benar bila kabar ini berhak berbunyi sekarang.
 *
 * Jam yang mundur — konteks audio yang diganti — diperlakukan seperti jalur
 * yang masih kosong, bukan dibungkam selamanya.
 */
export function cueAllowed(
  state: LaneState | null,
  cue: CombatCue,
  now: number,
): boolean {
  if (cue.always) return true;
  if (state === null) return true;
  if (now < state.at) return true;
  if (now - state.at >= CUE_WINDOW) return true;
  return cue.rank > state.rank;
}

/** Keadaan jalur sesudah sebuah kabar benar-benar berbunyi. */
export function nextLaneState(
  state: LaneState | null,
  cue: CombatCue,
  now: number,
): LaneState {
  const masihSejendela =
    state !== null && now >= state.at && now - state.at < CUE_WINDOW;
  return {
    at: now,
    rank: masihSejendela ? Math.max(state.rank, cue.rank) : cue.rank,
  };
}
