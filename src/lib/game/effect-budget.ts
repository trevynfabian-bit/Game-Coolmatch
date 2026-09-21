import { BURST_TIGHTEN, averageFireDelay } from "@/lib/game/bot-combat";
import { DIFFICULTY_PROFILES } from "@/lib/game/difficulty";
import { MAX_BOT_TEMPLATES } from "@/lib/mock/bots";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { shotInterval } from "@/lib/game/shooting";
import { enemyFlashSeconds } from "@/lib/game/muzzle-flash";
import {
  IMPACT_STYLE,
  tracerFor,
  tracerLifetime,
} from "@/lib/game/tracer-style";

/**
 * Berapa banyak objek efek yang perlu disiapkan, dihitung dari permainannya
 * sendiri.
 *
 * Kolam objek yang terlalu KECIL memakai ulang objek yang masih terlihat:
 * jejak peluru yang sedang melintas tiba-tiba melompat ke tembakan lain, dan
 * yang terlihat pemain adalah kedipan yang tidak ada sebabnya. Yang terlalu
 * BESAR membuang memori dan waktu render untuk objek yang tidak pernah
 * dipakai — pada permainan yang janji utamanya tetap ringan di peramban.
 *
 * Karena itu ukurannya tidak ditebak melainkan DITURUNKAN: dari laju tembak
 * senjata tercepat, banyaknya butir per tarikan pelatuk, jumlah musuh
 * terbanyak yang mungkin, dan umur tiap efek. Menambah senjata baru atau
 * memperpanjang umur sebuah efek otomatis menaikkan kolamnya, tanpa seorang
 * pun harus ingat menyetel angkanya.
 */

/**
 * Kelonggaran di atas hitungan terburuk.
 *
 * Bukan basa-basi: tembakan tidak datang rata. Beberapa musuh bisa menarik
 * pelatuk dalam frame yang sama, dan frame yang tersendat membuat dua
 * tembakan yang seharusnya berjarak terlihat berbarengan.
 */
export const POOL_SAFETY = 1.4;

/** Berapa objek yang hidup bersamaan bila sesuatu lahir `perSecond` kali per detik dan hidup `lifetime` detik. */
export function poolSize(perSecond: number, lifetime: number): number {
  const laju = Number.isFinite(perSecond) ? Math.max(0, perSecond) : 0;
  const umur = Number.isFinite(lifetime) ? Math.max(0, lifetime) : 0;
  return Math.max(1, Math.ceil(laju * umur * POOL_SAFETY));
}

/** Jejak peluru per detik dari satu penembak yang menahan pelatuk. */
function tracersPerSecond(weapon: (typeof MOCK_WEAPONS)[number]): number {
  return weapon.pellets / shotInterval(weapon);
}

/**
 * Laju tembak seorang musuh tingkat tersulit, tembakan per detik.
 *
 * Diambil dari jeda tembak profilnya, BUKAN dari laju siklus senjatanya:
 * musuh menembak dalam rentetan pendek yang diselingi napas, jadi laju
 * siklus akan melebih-lebihkan bebannya berkali lipat — dan kolam yang
 * ukurannya ditentukan angka yang mustahil hanya membuang memori.
 */
function botShotsPerSecond(): number {
  const tersulit = DIFFICULTY_PROFILES.susah;
  const rata = Math.max(
    ...MOCK_WEAPONS.map((w) => 1 / averageFireDelay(tersulit, w.damage)),
  );
  /*
    Di DALAM satu rentetan, jeda antar tembakan dirapatkan oleh pengendali
    tembak musuh — dan puncak sesaat itulah yang menentukan berapa objek
    hidup bersamaan, bukan rata-ratanya sepanjang waktu.
  */
  return rata / BURST_TIGHTEN;
}

/**
 * Kebutuhan terburuk jejak peluru: pemain menahan pelatuk senjata paling
 * boros jejak, sementara SELURUH musuh menembak ke arahnya.
 *
 * Satu tarikan pelatuk shotgun melepas delapan butir dalam frame yang SAMA,
 * jadi kebutuhannya tidak pernah lebih kecil dari jumlah butir itu betapapun
 * pendek umur jejaknya.
 */
export function worstTracerLoad(): number {
  const beban = MOCK_WEAPONS.map(
    (w) => tracersPerSecond(w) * tracerLifetime(30, tracerFor(w.type)),
  );
  const serentak = Math.max(...MOCK_WEAPONS.map((w) => w.pellets));
  const pemain = Math.max(...beban, serentak);
  const umurTerlama = Math.max(
    ...MOCK_WEAPONS.map((w) => tracerLifetime(30, tracerFor(w.type))),
  );
  return pemain + botShotsPerSecond() * umurTerlama * MAX_BOT_TEMPLATES;
}

/** Kebutuhan terburuk kilau tumbukan: tiap jejak pemain berakhir pada satu kilau. */
export function worstImpactLoad(): number {
  const umur = Math.max(
    IMPACT_STYLE.fighter.seconds,
    IMPACT_STYLE.world.seconds,
  );
  return Math.max(...MOCK_WEAPONS.map(tracersPerSecond)) * umur;
}

/** Kebutuhan terburuk kilatan moncong musuh: semua musuh menembak sekaligus. */
export function worstEnemyMuzzleLoad(): number {
  const terlama = Math.max(
    ...MOCK_WEAPONS.map((w) => enemyFlashSeconds(w.type)),
  );
  /*
    Tiap musuh menyalakan paling banyak satu kilatan pada satu saat, sebab
    kilatannya selalu lebih pendek daripada jeda tembak senjatanya sendiri —
    tetapi kilatan yang belum padam saat tembakan berikutnya datang memerlukan
    petak kedua, jadi bebannya dihitung dari perbandingan keduanya.
  */
  return Math.max(1, terlama * botShotsPerSecond()) * MAX_BOT_TEMPLATES;
}

/**
 * Ukuran kolam tiap efek, dihitung sekali saat modul dimuat.
 *
 * Dipakai komponen efek apa adanya; tidak ada angka kolam yang ditulis tangan
 * di tempat lain.
 */
export const EFFECT_POOLS = {
  tracer: Math.min(64, poolSize(worstTracerLoad(), 1)),
  impact: Math.min(48, poolSize(worstImpactLoad(), 1)),
  enemyMuzzle: Math.min(32, poolSize(worstEnemyMuzzleLoad(), 1)),
} as const;

/** Satu petak kolam; hanya dua hal yang perlu diketahui pemilih slot. */
export interface PooledSlot {
  active: boolean;
  /** Jam saat petak ini terakhir dipakai, detik. */
  firedAt: number;
}

/**
 * Memilih petak kolam untuk efek baru.
 *
 * Petak yang menganggur selalu didahulukan; bila semuanya terpakai, yang
 * dipakai ulang adalah yang PALING TUA — efek yang paling dekat ke akhir
 * umurnya, sehingga kedipan yang terlihat pemain sekecil mungkin. Pemilihan
 * bergilir sederhana tidak punya sifat itu: ia bisa menimpa jejak yang baru
 * saja berangkat sementara yang hampir padam dibiarkan.
 */
export function pickSlot(slots: readonly PooledSlot[]): number {
  let tertua = 0;
  let waktuTertua = Infinity;
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i].active) return i;
    if (slots[i].firedAt < waktuTertua) {
      waktuTertua = slots[i].firedAt;
      tertua = i;
    }
  }
  return tertua;
}
