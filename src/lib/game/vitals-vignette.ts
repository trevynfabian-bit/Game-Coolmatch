/**
 * Vignette merah di tepi layar: seberapa parah keadaan pemain, tanpa ia perlu
 * membaca angka nyawanya.
 *
 * Satu ambang saja — merah menyala di bawah tiga puluh — menyembunyikan
 * seluruh perjalanan menuju ke sana. Pemain bernyawa 31 melihat layar yang
 * sama bersihnya dengan pemain bernyawa penuh, lalu tiba-tiba semuanya merah.
 * Bertingkat membuat keadaannya terbaca sebagai sesuatu yang MEMBURUK, dan
 * itulah yang membuat pemain memutuskan mundur pada waktunya.
 *
 * Dipisah dari komponennya supaya tingkat dan ambangnya bisa diperiksa tanpa
 * browser, dan supaya menyetel keseimbangan nyawa tidak pernah membuat
 * warnanya berselisih dengan angkanya.
 */

export type VignetteTier = "bugar" | "terluka" | "kritis" | "sekarat";

export interface VignetteLook {
  /** Kepekatan tepi merah yang menetap, 0..1. Nol berarti layar bersih. */
  opacity: number;
  /**
   * Lama satu denyut, detik; null berarti tidak berdenyut sama sekali.
   * Makin parah makin cepat, seperti degup yang memburu.
   */
  pulseSeconds: number | null;
  /** Seberapa jauh merahnya merambat ke tengah layar, dalam persen. */
  reach: number;
  label: string;
}

/**
 * Ambang tiap tingkat sebagai pecahan nyawa penuh.
 *
 * Dinyatakan sebagai PECAHAN, bukan angka mutlak: nyawa penuh bisa berubah
 * saat keseimbangan disetel, dan ambang mutlak yang tertinggal akan berarti
 * hal yang sama sekali berbeda.
 */
export const VIGNETTE_THRESHOLDS = {
  terluka: 0.6,
  kritis: 0.35,
  sekarat: 0.15,
} as const;

export const VIGNETTE_LOOK: Record<VignetteTier, VignetteLook> = {
  bugar: {
    opacity: 0,
    pulseSeconds: null,
    reach: 0,
    label: "bugar",
  },
  // Terluka: hanya bayangan tipis di tepi, tanpa denyut. Cukup untuk terasa
  // bahwa sesuatu sudah terjadi, tidak cukup untuk mengganggu membidik.
  terluka: {
    opacity: 0.22,
    pulseSeconds: null,
    reach: 88,
    label: "terluka",
  },
  kritis: {
    opacity: 0.45,
    pulseSeconds: 1.6,
    reach: 78,
    label: "kritis",
  },
  // Sekarat: paling pekat, paling cepat berdenyut, dan merambat paling jauh
  // ke tengah — satu tembakan lagi sudah cukup.
  sekarat: {
    opacity: 0.62,
    pulseSeconds: 0.85,
    reach: 66,
    label: "sekarat",
  },
};

/** Tingkat keadaan pemain dari nyawanya. */
export function vignetteTier(health: number, maxHealth: number): VignetteTier {
  const penuh = Number.isFinite(maxHealth) && maxHealth > 0 ? maxHealth : 100;
  const nyawa = Number.isFinite(health) ? Math.max(0, health) : 0;
  const bagian = Math.min(1, nyawa / penuh);

  if (bagian <= VIGNETTE_THRESHOLDS.sekarat) return "sekarat";
  if (bagian <= VIGNETTE_THRESHOLDS.kritis) return "kritis";
  if (bagian <= VIGNETTE_THRESHOLDS.terluka) return "terluka";
  return "bugar";
}

/** Tampilan vignette untuk keadaan nyawa tertentu. */
export function vignetteLook(health: number, maxHealth: number): VignetteLook {
  return VIGNETTE_LOOK[vignetteTier(health, maxHealth)];
}

/**
 * Kepekatan puncak kilat merah saat kena tembak.
 *
 * Beratnya tembakan menentukan sebagian besarnya, tetapi keadaan pemain ikut
 * menambah: tembakan yang sama terasa jauh lebih mengancam saat nyawa tinggal
 * seperempat, dan layar yang ikut mengabarkannya membuat pemain mundur alih-
 * alih menukar tembakan terakhir yang tidak akan ia menangkan.
 */
export function flashPeak(severity: number, tier: VignetteTier): number {
  const s = Number.isFinite(severity) ? Math.min(1, Math.max(0, severity)) : 0;
  const tambahan = VIGNETTE_LOOK[tier].opacity * 0.35;
  return Math.min(0.95, 0.35 + s * 0.5 + tambahan);
}
