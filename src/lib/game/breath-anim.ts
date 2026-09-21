import type { IdleClip, Pose } from "@/lib/game/viewmodel-anim";

/**
 * Napas pemain, dilihat dari senjata yang dipegangnya.
 *
 * Ayunan diam sebelumnya satu gelombang sinus murni: naik dan turun sama
 * cepat, tanpa jeda, selamanya sama besar. Yang terbaca bukan orang yang
 * bernapas melainkan benda yang digantung di tali — dan karena besarnya tidak
 * pernah berubah, arena tidak punya cara memberitahu bahwa pemain baru saja
 * berlari sejauh setengah peta.
 *
 * Dua hal diperbaiki di sini. Bentuk napasnya dibuat TIDAK SIMETRIS: tarikan
 * napas lebih cepat daripada embusannya, dan ada jeda pendek sebelum tarikan
 * berikutnya — begitulah dada bergerak. Lalu besarnya mengikuti KELELAHAN:
 * berlari menaikkannya, dan ia mereda sendiri dalam beberapa detik sesudah
 * pemain berhenti.
 *
 * Besarnya tetap kecil dengan sengaja. Napas yang terlalu besar membuat
 * bidikan terasa tidak bisa dipercaya padahal peluru tetap berangkat dari
 * tengah layar; yang dicari adalah tanda hidup, bukan hambatan.
 */

export interface BreathStyle {
  /** Kecepatan yang dianggap "berlari penuh", satuan dunia per detik. */
  fullSpeed: number;
  /** Seberapa cepat kelelahan menumpuk saat berlari, per detik. */
  rise: number;
  /** Seberapa cepat kelelahan mereda saat berhenti, per detik. */
  fall: number;
  /** Seberapa besar napas membesar pada kelelahan penuh, sebagai pengali. */
  gain: number;
  /** Seberapa cepat napas memburu pada kelelahan penuh, sebagai pengali. */
  rateGain: number;
}

/*
  Menumpuknya jauh lebih cepat daripada meredanya, dan itu memang
  disengaja: lari pendek pun sudah membuat napas terasa, sementara
  meredanya butuh beberapa detik sehingga pemain yang baru sampai di
  posisi masih terlihat mengatur napas — bukan langsung tenang seolah
  tidak ke mana-mana.
*/
export const BREATH_STYLE: BreathStyle = {
  fullSpeed: 8.4,
  rise: 0.55,
  fall: 0.28,
  gain: 1.6,
  rateGain: 0.8,
};

export interface BreathState {
  /** Kelelahan 0..1; nol berarti pemain sudah tenang sepenuhnya. */
  exertion: number;
  /** Jam halaman saat kelelahan itu dicatat, detik. */
  at: number;
}

export const BREATH_REST: BreathState = { exertion: 0, at: 0 };

function jepit01(nilai: number): number {
  if (!Number.isFinite(nilai)) return 0;
  return Math.min(1, Math.max(0, nilai));
}

/** Kurva halus di kedua ujung. */
function halus(t: number): number {
  const p = jepit01(t);
  return p * p * (3 - 2 * p);
}

/**
 * Kelelahan sesudah waktu berjalan sampai `now` pada kecepatan tertentu.
 *
 * Diintegrasikan per frame, bukan dibaca langsung dari kecepatan saat ini.
 * Kecepatan sekarang hanya bercerita tentang frame ini; yang membuat napas
 * masuk akal adalah apa yang pemain lakukan beberapa detik terakhir.
 */
export function breathStep(
  state: BreathState,
  now: number,
  speed: number,
  style: BreathStyle = BREATH_STYLE,
): BreathState {
  if (!Number.isFinite(now)) return state;
  const dt = now - state.at;
  if (!(dt > 0)) return { exertion: state.exertion, at: state.at };

  // Dijepit supaya tab yang baru aktif kembali tidak melompat jauh dalam satu
  // langkah; jeda panjang di latar belakang bukan berarti pemain berlari.
  const langkah = Math.min(dt, 0.5);
  const target = jepit01(Number.isFinite(speed) ? speed / style.fullSpeed : 0);
  const laju = target > state.exertion ? style.rise : style.fall;
  const arah = target > state.exertion ? 1 : -1;
  const berikut = state.exertion + arah * laju * langkah;
  return {
    exertion: arah > 0 ? Math.min(target, berikut) : Math.max(target, berikut),
    at: now,
  };
}

/** Bagian daur napas yang dipakai menarik napas; sisanya mengembuskan. */
const TARIK = 0.4;
/** Bagian daur napas yang dipakai mengembuskan; sisanya jeda. */
const EMBUS = 0.45;

/**
 * Satu daur napas, -1 di dasar embusan sampai +1 di puncak tarikan.
 *
 * Tidak simetris dengan sengaja: tarikan memakai empat persepuluh daurnya,
 * embusan empat setengah persepuluh, dan sisanya jeda di dasar. Sinus murni
 * membagi keduanya rata dan tidak pernah berhenti — yang terlihat bukan orang
 * bernapas melainkan benda yang berayun.
 */
export function breathWave(phase: number): number {
  if (!Number.isFinite(phase)) return -1;
  const p = phase - Math.floor(phase);
  if (p < TARIK) return -1 + 2 * halus(p / TARIK);
  if (p < TARIK + EMBUS) return 1 - 2 * halus((p - TARIK) / EMBUS);
  // Jeda pendek di dasar sebelum tarikan berikutnya.
  return -1;
}

/** Napas pada suatu saat, sesudah kelelahan diperhitungkan. */
export function breathPose(
  time: number,
  state: BreathState,
  clip: IdleClip,
  style: BreathStyle = BREATH_STYLE,
): Pose {
  const t = Number.isFinite(time) ? time : 0;
  const lelah = jepit01(state.exertion);
  const besar = clip.bob * (1 + lelah * style.gain);
  const laju = clip.rate * (1 + lelah * style.rateGain);
  const gelombang = breathWave((t * laju) / (Math.PI * 2));

  /*
    Geser kiri-kanan memakai gelombangnya sendiri yang jauh lebih pelan.
    Napas menggerakkan dada naik-turun; yang menggeser senjata ke samping
    adalah badan yang tidak pernah benar-benar diam — dua hal berbeda, dan
    menyatukannya membuat senjata bergerak diagonal seperti diaduk.
  */
  const samping =
    Math.sin(t * clip.rate * 0.48) * clip.sway * (1 + lelah * 0.6);

  return {
    px: samping,
    py: gelombang * besar,
    pz: 0,
    rx: gelombang * besar * 0.6,
    ry: samping * 1.2,
    rz: 0,
  };
}
