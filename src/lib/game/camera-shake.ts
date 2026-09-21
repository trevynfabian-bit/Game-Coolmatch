/**
 * Guncangan kamera saat pemain kena tembak.
 *
 * Kena tembak harus terasa mengganggu, bukan sekadar terbaca. Angka nyawa yang
 * berkurang adalah kabar; pandangan yang tersentak adalah AKIBAT — dan
 * akibatnya itulah yang membuat pemain refleks mencari perlindungan alih-alih
 * bertahan di tempat sambil membaca HUD.
 *
 * Guncangannya sengaja kecil dan pendek. Guncangan besar membuat pemain
 * kehilangan bidikannya sama sekali, dan kehilangan bidikan tepat saat sedang
 * ditembaki berarti hukuman berlapis untuk satu kesalahan yang sama. Yang
 * dituju adalah "terasa dipukul", bukan "tidak bisa membalas".
 */

/** Simpangan terbesar yang mungkin, dalam radian (sekitar satu derajat). */
export const SHAKE_MAX_RADIANS = 0.018;
/** Lama guncangan terberat, detik. */
export const SHAKE_MAX_SECONDS = 0.34;
/** Kecepatan getarnya, putaran per detik. */
const SHAKE_HZ = 19;

export interface ShakeState {
  /** Simpangan awal guncangan ini, radian. */
  amplitude: number;
  /** Lama guncangan ini, detik. */
  seconds: number;
  /** Sudah berjalan berapa detik. */
  elapsed: number;
  /** Penggeser fase supaya dua guncangan berurutan tidak identik. */
  phase: number;
}

/** Guncangan kosong: tidak ada yang perlu digambar. */
export const NO_SHAKE: ShakeState = {
  amplitude: 0,
  seconds: 0,
  elapsed: 0,
  phase: 0,
};

/**
 * Bentuk guncangan untuk sebuah tembakan seberat `strength` (0..1 dari nyawa
 * penuh). Serempetan tetap terasa, tetapi jauh lebih ringan daripada tembakan
 * yang hampir menumbangkan.
 */
export function shakeFor(strength: number, phase = 0): ShakeState {
  const s = Number.isFinite(strength) ? Math.min(1, Math.max(0, strength)) : 0;
  return {
    // Akar kuadrat: tembakan ringan tetap terasa, sementara jarak antara
    // tembakan sedang dan berat tidak meledak jadi guncangan yang melumpuhkan.
    amplitude: SHAKE_MAX_RADIANS * (0.35 + 0.65 * Math.sqrt(s)),
    seconds: SHAKE_MAX_SECONDS * (0.55 + 0.45 * s),
    elapsed: 0,
    phase: Number.isFinite(phase) ? phase : 0,
  };
}

/**
 * Menggabungkan guncangan baru dengan yang sedang berjalan.
 *
 * Yang lebih KUAT menang, dan waktunya disetel ulang. Menjumlahkannya akan
 * membuat rentetan tembakan menumpuk jadi guncangan yang melumpuhkan; memilih
 * yang terkuat membuat tembakan terberat tetap terasa paling keras tanpa
 * pernah membuat pemain kehilangan kendali sepenuhnya.
 */
export function addShake(
  current: ShakeState,
  incoming: ShakeState,
): ShakeState {
  const sisa = current.seconds - current.elapsed;
  if (sisa <= 0) return incoming;
  return {
    amplitude: Math.max(current.amplitude, incoming.amplitude),
    seconds: Math.max(sisa, incoming.seconds),
    elapsed: 0,
    phase: incoming.phase,
  };
}

export interface ShakeOffset {
  /** Simpangan naik-turun, radian. */
  pitch: number;
  /** Simpangan kiri-kanan, radian. */
  yaw: number;
}

/**
 * Simpangan pandangan pada saat ini, meluruh sampai habis.
 *
 * Dua frekuensi yang tidak sepadan dipakai untuk pitch dan yaw supaya
 * gerakannya tidak terbaca sebagai garis lurus yang bolak-balik. Semuanya
 * ditentukan oleh waktu, bukan oleh angka acak: guncangan yang sama bisa
 * diperiksa tanpa browser, dan tidak pernah menghasilkan lompatan besar di
 * antara dua frame.
 */
export function shakeOffset(state: ShakeState): ShakeOffset {
  const sisa = state.seconds - state.elapsed;
  if (sisa <= 0 || state.amplitude <= 0) return { pitch: 0, yaw: 0 };

  const luruh = sisa / state.seconds;
  const kuat = state.amplitude * luruh * luruh;
  const t = state.elapsed * Math.PI * 2 * SHAKE_HZ + state.phase;
  return {
    pitch: Math.sin(t) * kuat,
    yaw: Math.sin(t * 0.73 + 1.1) * kuat * 0.8,
  };
}

/** Memajukan guncangan sejauh `delta` detik. */
export function stepShake(state: ShakeState, delta: number): ShakeState {
  const d = Number.isFinite(delta) ? Math.max(0, delta) : 0;
  const elapsed = state.elapsed + d;
  if (elapsed >= state.seconds) return NO_SHAKE;
  return { ...state, elapsed };
}

/** Benar bila guncangan ini masih menggerakkan apa pun. */
export function isShaking(state: ShakeState): boolean {
  return state.amplitude > 0 && state.elapsed < state.seconds;
}
