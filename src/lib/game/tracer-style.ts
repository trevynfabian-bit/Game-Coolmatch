import type { WeaponType } from "@/types/game";

/**
 * Jejak peluru dan kilau tumbukannya.
 *
 * Tembakan yang tidak meninggalkan jejak membuat baku tembak terbaca sebagai
 * angka yang berubah di HUD: pemain tahu ia kena, tetapi tidak tahu dari mana.
 * Jejak peluru menjawab pertanyaan yang paling sering diajukan dalam
 * permainan tembak-tembakan — "tadi itu datang dari mana?" — tanpa satu pun
 * kata di layar.
 *
 * Jejaknya TUMBUH dari moncong ke titik jatuh, bukan muncul utuh seketika.
 * Garis yang muncul utuh terbaca sebagai sinar laser yang menghubungkan dua
 * titik; garis yang tumbuh terbaca sebagai sesuatu yang bergerak, dan arah
 * gerakannya itulah yang memberi tahu siapa menembak siapa.
 */

export interface TracerStyle {
  /** Tebal garisnya, satuan dunia. */
  thickness: number;
  /** Kecepatan ujung jejak, satuan dunia per detik. */
  speed: number;
  /** Lama memudar sesudah ujungnya sampai, detik. */
  fade: number;
  color: string;
  /** Kepekatan puncaknya, 0..1. */
  opacity: number;
}

export const TRACER_STYLE: Record<WeaponType, TracerStyle> = {
  pistol: {
    thickness: 0.032,
    speed: 150,
    fade: 0.07,
    color: "#ffe8a3",
    opacity: 0.8,
  },
  // SMG menembak paling sering: jejaknya paling tipis dan paling cepat pudar,
  // kalau tidak layar akan penuh garis sepanjang rentetan.
  smg: {
    thickness: 0.024,
    speed: 170,
    fade: 0.05,
    color: "#ffeec2",
    opacity: 0.7,
  },
  rifle: {
    thickness: 0.036,
    speed: 190,
    fade: 0.09,
    color: "#ffe8a3",
    opacity: 0.85,
  },
  // Shotgun melepas delapan butir sekaligus: tiap jejaknya dibuat paling tipis
  // dan paling pendek umurnya supaya yang terlihat adalah SEBARANNYA, bukan
  // delapan garis tebal yang saling menimpa.
  shotgun: {
    thickness: 0.022,
    speed: 130,
    fade: 0.05,
    color: "#ffdf9a",
    opacity: 0.65,
  },
  // Sniper: paling tebal, paling cepat, dan paling lama tertinggal di udara —
  // jejaknya sendiri yang memberi tahu seluruh arena dari mana tembakan itu
  // datang.
  sniper: {
    thickness: 0.05,
    speed: 320,
    fade: 0.22,
    color: "#fff4d0",
    opacity: 0.95,
  },
};

export function tracerFor(type: WeaponType | null | undefined): TracerStyle {
  if (!type) return TRACER_STYLE.rifle;
  return TRACER_STYLE[type] ?? TRACER_STYLE.rifle;
}

export interface TracerFrame {
  /** Panjang jejak yang sudah terbentuk dari moncong, satuan dunia. */
  head: number;
  /** Kepekatan saat ini, 0..1. */
  alpha: number;
  /** Benar bila jejaknya sudah habis dan slotnya boleh dipakai ulang. */
  done: boolean;
}

/**
 * Keadaan sebuah jejak pada detik tertentu sesudah tembakan.
 *
 * Murni dan tanpa three.js supaya bisa diperiksa tanpa browser: pertanyaan
 * "apakah jejak sniper benar-benar sampai lebih cepat daripada jejak shotgun"
 * adalah pertanyaan tentang fungsi ini.
 */
export function tracerFrame(
  total: number,
  elapsed: number,
  style: TracerStyle,
): TracerFrame {
  const jarak = Math.max(0, total);
  const t = Math.max(0, elapsed);
  const sampai = jarak / style.speed;
  const head = Math.min(jarak, t * style.speed);

  if (t <= sampai) {
    return { head, alpha: style.opacity, done: false };
  }
  const sisa = 1 - (t - sampai) / style.fade;
  if (sisa <= 0) return { head: jarak, alpha: 0, done: true };
  return { head: jarak, alpha: style.opacity * sisa, done: false };
}

/** Lama seluruh jejak sebuah tembakan sejauh `total`, detik. */
export function tracerLifetime(total: number, style: TracerStyle): number {
  return Math.max(0, total) / style.speed + style.fade;
}

export interface ImpactStyle {
  /** Jari-jari kilau pada puncaknya, satuan dunia. */
  radius: number;
  seconds: number;
  color: string;
}

/**
 * Kilau di titik jatuh peluru. Kena badan dibedakan dari kena dinding — itulah
 * kabar paling penting yang bisa disampaikan sebuah percikan.
 */
export const IMPACT_STYLE: { fighter: ImpactStyle; world: ImpactStyle } = {
  fighter: { radius: 0.16, seconds: 0.26, color: "#fff0c0" },
  world: { radius: 0.1, seconds: 0.34, color: "#ffd27a" },
};

export interface ImpactFrame {
  scale: number;
  alpha: number;
  done: boolean;
}

/**
 * Keadaan kilau pada detik tertentu: mekar cepat lalu surut.
 *
 * Mekarnya sepersepuluh bagian pertama umurnya. Percikan yang langsung
 * sebesar-besarnya lalu mengecil terbaca sebagai bola yang menyusut, bukan
 * sebagai benturan.
 */
export function impactFrame(elapsed: number, style: ImpactStyle): ImpactFrame {
  const t = Math.max(0, elapsed);
  if (t >= style.seconds) return { scale: 0, alpha: 0, done: true };
  const life = t / style.seconds;
  const mekar = 0.18;
  const scale = life < mekar ? life / mekar : 1 - (life - mekar) / (1 - mekar);
  return { scale: Math.max(0.05, scale), alpha: 1 - life, done: false };
}
