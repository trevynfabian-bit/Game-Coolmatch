import type { Pose } from "@/lib/game/viewmodel-anim";
import type { WeaponType } from "@/types/game";

/**
 * Gerak senjata saat mengisi ulang.
 *
 * Dipisah dari kontroler animasi karena isi ulang adalah satu-satunya gerakan
 * senjata yang lamanya DITENTUKAN DARI LUAR: pistol selesai dalam 1,4 detik,
 * sniper butuh 3,6 detik, dan angkanya datang dari data senjata, bukan dari
 * animasinya.
 *
 * Itu yang membuat kemajuan 0..1 tidak cukup. Menurunkan senjata pada
 * "delapan belas persen pertama" berarti tangan yang menurunkan pistol
 * bergerak dua setengah kali lebih cepat daripada tangan yang menurunkan
 * sniper — padahal yang berbeda adalah pekerjaan di bawah sana, bukan cara
 * menurunkan senjatanya. Di sini turun dan naiknya dihitung dalam DETIK
 * sungguhan, dan hanya bagian tengahnya yang meregang mengikuti lama isi
 * ulang tiap senjata.
 */

/** Cara senjata diisi ulang; menentukan watak gerakan tangannya. */
export type ReloadKind =
  /** Magasin dilepas lalu diganti: dua hentakan, satu keluar satu masuk. */
  | "magasin"
  /** Selongsong dimasukkan satu per satu: banyak hentakan kecil. */
  | "selongsong"
  /** Baut ditarik lalu didorong: satu gerakan panjang. */
  | "baut";

export interface ReloadStyle {
  kind: ReloadKind;
  /** Lama senjata diturunkan sampai titik terendah, detik. */
  downSeconds: number;
  /** Lama senjata diangkat kembali ke pandangan, detik. */
  upSeconds: number;
  /** Berapa kali tangan bekerja selama senjata ada di bawah. */
  beats: number;
  /** Seberapa besar hentakan kerja itu, relatif terhadap turunnya senjata. */
  beatDepth: number;
}

export const RELOAD_STYLES: Record<WeaponType, ReloadStyle> = {
  pistol: {
    kind: "magasin",
    downSeconds: 0.18,
    upSeconds: 0.22,
    beats: 2,
    beatDepth: 0.45,
  },
  smg: {
    kind: "magasin",
    downSeconds: 0.16,
    upSeconds: 0.2,
    beats: 2,
    beatDepth: 0.4,
  },
  rifle: {
    kind: "magasin",
    downSeconds: 0.2,
    upSeconds: 0.26,
    beats: 2,
    beatDepth: 0.5,
  },
  // Selongsong dimasukkan satu per satu, jadi hentakannya banyak dan pendek.
  shotgun: {
    kind: "selongsong",
    downSeconds: 0.22,
    upSeconds: 0.3,
    beats: 5,
    beatDepth: 0.65,
  },
  // Baut ditarik sekali lalu didorong sekali: satu gerakan panjang dan berat.
  sniper: {
    kind: "baut",
    downSeconds: 0.24,
    upSeconds: 0.32,
    beats: 1,
    beatDepth: 0.85,
  },
};

/** Gaya isi ulang sebuah senjata; jenis tak dikenal memakai senapan serbu. */
export function reloadStyleFor(
  type: WeaponType | null | undefined,
): ReloadStyle {
  if (!type) return RELOAD_STYLES.rifle;
  return RELOAD_STYLES[type] ?? RELOAD_STYLES.rifle;
}

export interface ReloadStages {
  /** Lama turun, detik. */
  down: number;
  /** Lama tangan bekerja di bawah, detik. */
  work: number;
  /** Lama naik, detik. */
  up: number;
}

/**
 * Berapa detik untuk turun, bekerja, dan naik pada satu isi ulang.
 *
 * Turun dan naik dijepit bersama-sama supaya keduanya tidak pernah memakan
 * seluruh waktu: senjata yang isi ulangnya sangat cepat harus tetap sempat
 * TERLIHAT bekerja di bawah, kalau tidak yang tampak hanyalah senjata yang
 * bergetar sekali lalu kembali. Menjepitnya secara proporsional — bukan
 * memotong salah satu — membuat perbandingan turun dan naiknya tetap sama
 * pada senjata secepat apa pun.
 */
export function reloadStages(
  seconds: number,
  style: ReloadStyle,
): ReloadStages {
  const total = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  if (total <= 0) return { down: 0, work: 0, up: 0 };

  const diminta = style.downSeconds + style.upSeconds;
  const jatah = total * 0.7;
  const skala = diminta > jatah ? jatah / diminta : 1;
  const down = style.downSeconds * skala;
  const up = style.upSeconds * skala;
  return { down, work: Math.max(0, total - down - up), up };
}

export interface ReloadDrive {
  phase: "diam" | "turun" | "kerja" | "naik";
  /** Seberapa jauh senjata sedang turun, 0..1. */
  strength: number;
  /** Hentakan kerja tangan, -1..1; nol di luar tahap kerja. */
  beat: number;
  /**
   * Sejauh mana tahap kerja sudah berjalan, 0..1; nol di luar tahap itu.
   *
   * Terpisah dari `beat` karena keduanya menjawab pertanyaan yang berbeda:
   * `beat` adalah irama tangan yang berulang beberapa kali, sedangkan ini
   * adalah URUTAN pekerjaannya — magasin lama keluar dulu, baru magasin baru
   * masuk, dan itu hanya terjadi sekali.
   */
  work: number;
}

export const RELOAD_IDLE: ReloadDrive = {
  phase: "diam",
  strength: 0,
  beat: 0,
  work: 0,
};

/** Kurva halus di kedua ujung, supaya senjata tidak menyentak saat turun. */
function halus(t: number): number {
  const p = Math.min(1, Math.max(0, t));
  return p * p * (3 - 2 * p);
}

/**
 * Tahap isi ulang pada satu saat: sedang turun, sedang dikerjakan, atau
 * sedang diangkat lagi.
 *
 * Waktunya dihitung dari DETIK BERJALAN, bukan dari kemajuan 0..1, supaya
 * tahap turun dan naik benar-benar selama yang ditulis gayanya.
 */
export function reloadDrive(
  elapsed: number,
  seconds: number,
  style: ReloadStyle,
): ReloadDrive {
  const total = Number.isFinite(seconds) ? seconds : 0;
  const t = Number.isFinite(elapsed) ? elapsed : -1;
  if (total <= 0 || t <= 0 || t >= total) return RELOAD_IDLE;

  const tahap = reloadStages(total, style);
  if (t < tahap.down) {
    return {
      phase: "turun",
      strength: halus(t / tahap.down),
      beat: 0,
      work: 0,
    };
  }

  const sesudahKerja = tahap.down + tahap.work;
  if (t < sesudahKerja) {
    const bagian = tahap.work > 0 ? (t - tahap.down) / tahap.work : 1;
    return {
      phase: "kerja",
      strength: 1,
      beat: Math.sin(bagian * Math.PI * 2 * style.beats),
      work: bagian,
    };
  }

  const naik = tahap.up > 0 ? (t - sesudahKerja) / tahap.up : 1;
  return { phase: "naik", strength: 1 - halus(naik), beat: 0, work: 1 };
}

export interface ReloadLook {
  /** Seberapa jauh senjata diturunkan dari pandangan. */
  drop: number;
  /** Seberapa jauh ia dimiringkan ke dalam, radian. */
  tilt: number;
}

/**
 * Pose senjata untuk satu tahap isi ulang.
 *
 * Hentakan kerja ditumpangkan DI ATAS turunnya senjata, bukan menggantikannya:
 * tangan yang menghentak magasin tidak mengangkat senjatanya kembali.
 */
export function reloadPoseFrom(drive: ReloadDrive, look: ReloadLook): Pose {
  if (drive.strength <= 0) {
    return { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };
  }
  const k = drive.strength;
  const hentak = drive.beat * look.drop * 0.12;
  return {
    px: look.drop * 0.25 * k,
    py: -look.drop * k + hentak,
    pz: look.drop * 0.4 * k - hentak * 0.5,
    rx: look.tilt * k + drive.beat * look.tilt * 0.1,
    ry: -look.tilt * 0.8 * k,
    rz: look.tilt * 1.4 * k,
  };
}

export interface MagazineMotion {
  /** Geser magasin dari tempatnya, satuan lokal; negatif berarti lepas. */
  y: number;
  /** Putar magasin saat terlepas, radian. */
  rz: number;
  /** Magasin terlihat; salah berarti sudah lepas dan belum diganti. */
  visible: boolean;
}

export const MAGAZINE_AT_REST: MagazineMotion = { y: 0, rz: 0, visible: true };

/**
 * Gerak magasin selama isi ulang.
 *
 * Inilah yang membuat isi ulang TERBACA sebagai isi ulang dan bukan sekadar
 * senjata yang turun sebentar: ada benda yang benar-benar lepas dari senjata
 * lalu kembali. Senjata bermagasin melepasnya di paruh pertama dan memasang
 * yang baru di paruh kedua; shotgun dan sniper tidak melepas apa pun, jadi
 * magasinnya hanya ikut terguncang oleh kerja tangan.
 */
export function magazineMotion(
  drive: ReloadDrive,
  style: ReloadStyle,
): MagazineMotion {
  if (drive.phase !== "kerja") return MAGAZINE_AT_REST;

  if (style.kind !== "magasin") {
    return { y: drive.beat * 0.012, rz: 0, visible: true };
  }

  /*
    Dibagi dua atas urutan kerjanya, bukan atas iramanya: magasin lama
    meluncur keluar pada paruh pertama, ada jeda pendek tanpa magasin sama
    sekali, lalu magasin baru didorong masuk pada paruh kedua. Keduanya
    miring ke arah berlawanan — satu jatuh, satu didorong — supaya yang
    terlihat benar-benar DUA magasin dan bukan satu magasin yang turun lalu
    naik lagi.
  */
  const JEDA = 0.05;
  const w = drive.work;
  if (w < 0.5 - JEDA) {
    const dalam = w / (0.5 - JEDA);
    return { y: -dalam * 0.26, rz: -dalam * 0.5, visible: dalam < 0.92 };
  }
  if (w < 0.5 + JEDA) return { y: -0.26, rz: -0.5, visible: false };
  const dalam = 1 - (w - (0.5 + JEDA)) / (0.5 - JEDA);
  return { y: -dalam * 0.26, rz: dalam * 0.5, visible: dalam < 0.92 };
}
