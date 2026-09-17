/**
 * Pengaturan permainan: suara, tombol, dan tampilan.
 *
 * Bentuk dan nilai bawaannya ditaruh di sini, terpisah dari store yang
 * menyimpannya dan dari layar yang menampilkannya. Dengan begitu bagian mana
 * pun yang nanti benar-benar MEMAKAI pengaturan ini — mesin suara, kanvas
 * arena — cukup membaca angkanya tanpa ikut bergantung pada layar Pengaturan.
 */

/** Volume dinyatakan 0..100, karena begitulah pemain membacanya. */
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 100;

export interface AudioSettings {
  /** Suara tembakan, langkah, dan benturan. */
  effects: number;
  /** Musik latar. */
  music: number;
  /** Membisukan semuanya tanpa menghapus angka di atas. */
  muted: boolean;
}

export type QualityLevel = "rendah" | "sedang" | "tinggi";

/** Skala resolusi dinyatakan dalam persen, karena begitulah pemain membacanya. */
export const SCALE_MIN = 50;
export const SCALE_MAX = 100;

export interface DisplaySettings {
  quality: QualityLevel;
  /**
   * Seberapa besar gambar digambar sebelum diregangkan ke layar, 50..100
   * persen. Terpisah dari tingkat kualitas dan memang harus terpisah:
   * kualitas menentukan APA yang digambar — bayangan, penghalusan tepi —
   * sedangkan skala menentukan seberapa banyak piksel yang dihitung. Pemain
   * berlayar besar sering butuh menurunkan yang kedua tanpa kehilangan yang
   * pertama.
   */
  renderScale: number;
  /** Menampilkan penghitung frame di sudut arena. */
  showFps: boolean;
}

export interface GameSettings {
  audio: AudioSettings;
  display: DisplaySettings;
}

/**
 * Apa arti tiap tingkat kualitas, dalam angka yang benar-benar dipakai kanvas
 * 3D maupun dalam kalimat yang dibaca pemain.
 *
 * Keduanya berdampingan dengan sengaja. Pemain memilih dari kalimatnya —
 * "lancar di laptop tanpa kartu grafis" jauh lebih berguna daripada "dpr 1" —
 * sementara kanvas membaca angkanya. Menyimpan keduanya di satu tempat
 * membuatnya mustahil berselisih: menaikkan batas dpr tanpa memperbarui
 * kalimatnya akan langsung terlihat di baris yang sama.
 */
export const QUALITY_PROFILES: Record<
  QualityLevel,
  {
    label: string;
    note: string;
    /** Rentang device pixel ratio untuk kanvas 3D. */
    dpr: [number, number];
    shadows: boolean;
    antialias: boolean;
  }
> = {
  rendah: {
    label: "Rendah",
    note: "Paling ringan. Bayangan dimatikan dan gambarnya sedikit kasar, tetapi tetap lancar di laptop tanpa kartu grafis.",
    dpr: [1, 1],
    shadows: false,
    antialias: false,
  },
  sedang: {
    label: "Sedang",
    note: "Bayangan menyala dan tepi gambar dihaluskan. Pilihan yang masuk akal untuk kebanyakan perangkat.",
    dpr: [1, 1.5],
    shadows: true,
    antialias: true,
  },
  tinggi: {
    label: "Tinggi",
    note: "Gambar paling tajam, terutama pada layar beresolusi tinggi. Paling berat, jadi pilih ini kalau frame-nya masih terasa mulus.",
    dpr: [1, 2],
    shadows: true,
    antialias: true,
  },
};

/** Urutan tampil tingkat kualitas, dari yang paling ringan. */
export const QUALITY_ORDER: QualityLevel[] = ["rendah", "sedang", "tinggi"];

export const DEFAULT_SETTINGS: GameSettings = {
  audio: { effects: 80, music: 45, muted: false },
  // Bukan "tinggi". Bawaan sebaiknya berjalan lancar di perangkat mana pun;
  // pemain berperangkat kuat akan menaikkannya sendiri, sementara pemain
  // berperangkat lemah belum tentu tahu bahwa tersendat-sendatnya bisa
  // diperbaiki dari layar ini.
  display: { quality: "sedang", renderScale: SCALE_MAX, showFps: false },
};

/** Menjepit volume ke rentang yang sah dan membulatkannya. */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, Math.round(value)));
}

/** Menjepit skala resolusi ke rentang yang sah dan membulatkannya. */
export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return SCALE_MAX;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(value)));
}

/**
 * Rentang device pixel ratio yang benar-benar dipakai kanvas, sesudah tingkat
 * kualitas dan skala resolusi digabung.
 *
 * Batas bawahnya ikut turun bersama skalanya. Kalau tidak, menyetel skala ke
 * 50 persen tidak mengubah apa pun pada layar biasa — batas bawah 1 akan
 * menaikkannya kembali, dan pemain menyimpulkan penggesernya rusak.
 */
export function canvasDpr(
  quality: QualityLevel,
  renderScale: number,
): [number, number] {
  const [min, max] = QUALITY_PROFILES[quality].dpr;
  const skala = clampScale(renderScale) / SCALE_MAX;
  return [Math.min(min, max * skala), max * skala];
}

export function isQualityLevel(value: unknown): value is QualityLevel {
  return typeof value === "string" && value in QUALITY_PROFILES;
}

/**
 * Volume yang benar-benar terdengar, sesudah tombol bisu diperhitungkan.
 *
 * Dinyatakan 0..1 karena itulah yang diminta Web Audio, dan dihitung di sini
 * supaya tiap pemakai suara tidak perlu mengingat sendiri bahwa `muted`
 * mengalahkan angka volumenya.
 */
export function effectiveVolume(
  audio: AudioSettings,
  kind: "effects" | "music",
): number {
  if (audio.muted) return 0;
  return clampVolume(audio[kind]) / VOLUME_MAX;
}
