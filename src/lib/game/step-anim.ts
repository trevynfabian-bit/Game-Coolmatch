import type { Pose, WalkClip } from "@/lib/game/viewmodel-anim";

/**
 * Goyangan senjata yang mengikuti LANGKAH pemain.
 *
 * Sebelumnya goyangan dihitung dari jam halaman dikali sebuah frekuensi yang
 * ikut berubah bersama kecepatan. Cara itu punya cacat yang terasa persis di
 * saat yang paling sering terjadi: begitu kecepatan berubah — mulai berlari,
 * menabrak dinding, melompat — seluruh fasenya ikut berubah seketika, sebab
 * frekuensinya dikalikan ke waktu yang sudah berjalan sejak awal. Senjata
 * menyentak ke posisi yang sama sekali lain tanpa satu langkah pun diambil.
 *
 * Di sini fasenya DIINTEGRASIKAN dari jarak yang benar-benar ditempuh: tiap
 * frame menambah sepersekian langkah sesuai jarak yang baru saja dilalui
 * dibagi panjang langkah. Kecepatan yang berubah hanya mengubah seberapa
 * cepat fase itu maju, bukan di mana ia berada — persis seperti kaki yang
 * mempercepat langkah tanpa pernah melompat ke tengah langkah berikutnya.
 *
 * Satu daur berarti DUA langkah, kiri dan kanan. Naik-turunnya karena itu
 * berfrekuensi dua kali goyangan kiri-kanannya: kedua kaki sama-sama
 * menurunkan badan, sementara hanya satu kaki yang melemparkannya ke kanan.
 */

export interface StepStyle {
  /** Panjang langkah saat berjalan pelan, satuan dunia. */
  strideWalk: number;
  /** Panjang langkah saat berlari penuh, satuan dunia. */
  strideRun: number;
  /** Kecepatan yang dianggap berlari penuh, satuan dunia per detik. */
  fullSpeed: number;
  /** Di bawah kecepatan ini pemain dianggap berhenti. */
  minSpeed: number;
}

/*
  Langkah MEMANJANG saat berlari, tidak hanya menjadi lebih cepat. Itu
  sebabnya goyangan lari tidak terasa seperti goyangan jalan yang diputar
  cepat: kakinya lebih jarang menyentuh tanah daripada yang diduga orang dari
  kecepatannya.
*/
export const STEP_STYLE: StepStyle = {
  strideWalk: 1.5,
  strideRun: 2.3,
  fullSpeed: 8.4,
  minSpeed: 0.35,
};

export interface StepState {
  /** Fase langkah dalam daur; satu daur sama dengan dua langkah. */
  phase: number;
  /** Jam halaman saat fase itu dicatat, detik. */
  at: number;
}

export const STEP_REST: StepState = { phase: 0, at: 0 };

function aman(nilai: number, bawaan = 0): number {
  return Number.isFinite(nilai) ? nilai : bawaan;
}

/** Panjang langkah pada kecepatan tertentu. */
export function strideFor(
  speed: number,
  style: StepStyle = STEP_STYLE,
): number {
  const laju = Math.min(1, Math.max(0, aman(speed) / style.fullSpeed));
  return style.strideWalk + (style.strideRun - style.strideWalk) * laju;
}

/**
 * Fase langkah sesudah waktu berjalan sampai `now` pada kecepatan tertentu.
 *
 * Fase hanya MAJU, tidak pernah melompat. Saat pemain berhenti, ia ditahan di
 * tempatnya alih-alih disetel ulang: berhenti sesaat lalu jalan lagi harus
 * melanjutkan langkah, bukan memulai langkah baru dari nol di tengah jalan.
 */
export function stepStep(
  state: StepState,
  now: number,
  speed: number,
  style: StepStyle = STEP_STYLE,
): StepState {
  if (!Number.isFinite(now)) return state;
  const dt = now - state.at;
  if (!(dt > 0)) return state;

  // Dijepit supaya tab yang baru aktif kembali tidak melompatkan langkah.
  const langkah = Math.min(dt, 0.5);
  const laju = Math.max(0, aman(speed));
  if (laju < style.minSpeed) return { phase: state.phase, at: now };

  // Satu daur = dua langkah, jadi jaraknya dibagi dua panjang langkah.
  const maju = (laju * langkah) / (strideFor(laju, style) * 2);
  return { phase: state.phase + maju, at: now };
}

/**
 * Benar bila ada kaki yang menjejak tanah di antara dua fase.
 *
 * Dua kali tiap daur: pada fase setengah dan pada fase bulat. Dipakai
 * penggambar — dan nanti bunyi langkah — supaya semuanya memakai satu jam
 * langkah yang sama, bukan menghitung sendiri-sendiri dan berselisih.
 */
export function stepFootfall(before: number, after: number): boolean {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return false;
  return Math.floor(after * 2) > Math.floor(before * 2);
}

/**
 * Goyangan senjata pada suatu fase langkah.
 *
 * Besarnya mengikuti kecepatan, sementara iramanya mengikuti fase. Pemain
 * yang berhenti karena itu berhenti bergoyang tanpa fasenya perlu disetel
 * ulang.
 */
export function stepPose(
  state: StepState,
  speed: number,
  clip: WalkClip,
): Pose {
  const laju = Math.min(1, Math.max(0, aman(speed) / clip.fullSpeed));
  if (laju <= 0.001) return { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };

  const t = aman(state.phase) * Math.PI * 2;
  return {
    px: Math.sin(t) * clip.sway * laju,
    /*
      Kedua kaki sama-sama menurunkan badan: dua kali per daur, dan selalu ke
      bawah — langkah tidak pernah melemparkan badan ke atas melewati tinggi
      diamnya.

      Kosinus, bukan sinus, supaya titik terendahnya jatuh PERSIS pada fase
      yang dilaporkan stepFootfall sebagai jejakan kaki. Dengan sinus keduanya
      berselisih seperempat daur, dan bunyi langkah yang nanti memakai jam
      yang sama akan terdengar saat senjata justru sedang di puncaknya.
    */
    py: -Math.abs(Math.cos(t)) * clip.bob * laju,
    pz: 0,
    rx: Math.sin(t * 2) * clip.bob * laju * 0.8,
    ry: Math.sin(t) * clip.sway * laju * 0.9,
    rz: Math.sin(t) * clip.sway * laju * 1.6,
  };
}
