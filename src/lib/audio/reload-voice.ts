import type { WeaponType } from "@/types/game";

/**
 * Rangkaian bunyi isi ulang tiap senjata, sebagai angka murni.
 *
 * Isi ulang bukan satu bunyi melainkan sebuah RANGKAIAN, dan panjangnya sama
 * dengan lamanya isi ulang senjata itu. Dua ketukan pendek yang selesai dalam
 * seperlima detik — seperti sebelumnya — membuat sniper yang butuh 3,6 detik
 * terasa seolah sudah siap tembak padahal belum; telinga menyimpulkan senjata
 * sudah terisi jauh sebelum tangannya selesai. Dengan rangkaian yang
 * direntangkan sepanjang durasinya, bunyi terakhir jatuh tepat menjelang
 * senjata benar-benar siap, dan pemain tahu kapan boleh mengintip lagi tanpa
 * melihat HUD.
 *
 * Ditaruh terpisah dari mesin audio supaya urutannya bisa diperiksa tanpa
 * browser: "apakah langkah terakhir shotgun benar-benar jatuh di ujung" adalah
 * pertanyaan tentang tabel ini.
 */

export interface ReloadStep {
  /** Kapan langkah ini terdengar, sebagai pecahan dari lama isi ulang, 0..1. */
  at: number;
  gain: number;
  /** Batas bawah highpass ketukan; makin tinggi makin ringan bunyinya. */
  cutoff: number;
  decay: number;
  /**
   * Nada dentum rendah yang menyertainya, hertz; null untuk ketukan kering.
   * Magasin yang masuk punya bobot, kuku pengunci tidak.
   */
  thump: number | null;
  /** Apa yang sedang terjadi, untuk keperluan pemeriksaan. */
  label: string;
}

export interface ReloadVoice {
  /** Lama isi ulang bawaan senjata ini, dipakai saat pemanggil tidak menyebutnya. */
  nominalSeconds: number;
  steps: readonly ReloadStep[];
}

/** Melepas magasin: ketukan tipis dan tinggi. */
function lepas(at: number, label = "kunci magasin dilepas"): ReloadStep {
  return { at, gain: 0.12, cutoff: 3200, decay: 0.05, thump: null, label };
}

/** Magasin ditarik keluar: gesekan yang sedikit lebih panjang. */
function keluar(at: number): ReloadStep {
  return {
    at,
    gain: 0.16,
    cutoff: 1500,
    decay: 0.11,
    thump: 150,
    label: "magasin keluar",
  };
}

/** Magasin baru ditekan masuk: ketukan berbobot, inilah bunyi paling tegas. */
function pasang(at: number): ReloadStep {
  return {
    at,
    gain: 0.26,
    cutoff: 900,
    decay: 0.09,
    thump: 110,
    label: "magasin masuk",
  };
}

/** Kokang: kuku metalik yang ditarik lalu dilepas. */
function kokang(at: number, label = "kokang"): ReloadStep {
  return { at, gain: 0.2, cutoff: 2600, decay: 0.06, thump: 220, label };
}

/** Satu selongsong shotgun disusupkan ke tabung. */
function selongsong(at: number, nomor: number): ReloadStep {
  return {
    at,
    gain: 0.18,
    cutoff: 1800,
    decay: 0.07,
    thump: 170,
    label: `selongsong ${nomor}`,
  };
}

export const RELOAD_VOICE: Record<WeaponType, ReloadVoice> = {
  pistol: {
    nominalSeconds: 1.4,
    steps: [lepas(0.06), keluar(0.24), pasang(0.58), kokang(0.88, "slide")],
  },
  smg: {
    nominalSeconds: 1.9,
    steps: [lepas(0.05), keluar(0.2), pasang(0.56), kokang(0.85)],
  },
  rifle: {
    nominalSeconds: 2.3,
    steps: [
      lepas(0.05),
      keluar(0.22),
      pasang(0.55),
      kokang(0.86, "tuas pelepas bolt"),
    ],
  },
  // Shotgun tidak punya magasin: selongsongnya dimasukkan satu per satu, dan
  // itulah yang membuat isi ulangnya terdengar lama meski tiap ketukannya
  // pendek. Pompa menutup rangkaian.
  shotgun: {
    nominalSeconds: 3.1,
    steps: [
      selongsong(0.1, 1),
      selongsong(0.28, 2),
      selongsong(0.46, 3),
      selongsong(0.64, 4),
      kokang(0.88, "pompa"),
    ],
  },
  sniper: {
    nominalSeconds: 3.6,
    steps: [
      lepas(0.06),
      keluar(0.26),
      pasang(0.58),
      kokang(0.8, "bolt ditarik"),
      kokang(0.92, "bolt didorong"),
    ],
  },
};

export interface TimedReloadStep extends ReloadStep {
  /** Detik sejak isi ulang dimulai. */
  time: number;
}

/**
 * Rangkaian isi ulang dengan waktu nyata, diregangkan ke lamanya isi ulang
 * senjata yang sedang dipakai.
 *
 * Lama isi ulang datang dari katalog senjata, bukan dari tabel di atas, supaya
 * menyetel ulang keseimbangan senjata tidak pernah membuat bunyinya berselisih
 * dengan jam isi ulang yang dilihat pemain di HUD. Durasi yang tidak masuk akal
 * jatuh ke nominal senjatanya alih-alih menumpuk semua ketukan di satu titik.
 */
export function reloadSequence(
  type: WeaponType,
  seconds?: number,
): TimedReloadStep[] {
  const voice = RELOAD_VOICE[type];
  const lama =
    typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0.2
      ? seconds
      : voice.nominalSeconds;
  return voice.steps.map((step) => ({ ...step, time: step.at * lama }));
}
