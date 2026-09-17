import type { DifficultyProfile } from "@/lib/game/difficulty";

/**
 * Aturan tembak musuh otomatis: kapan ia menarik pelatuk dan seberapa besar
 * peluang tembakannya kena.
 *
 * Dipisah dari komponen supaya bisa diperiksa tanpa browser, dan supaya
 * penyetelan rasa main — seberapa mematikan tiap tingkat kesulitan — terbaca di
 * satu tempat alih-alih tersebar di dalam loop frame.
 */

/**
 * Jarak saat ketepatan mulai luruh, dan jarak saat ia sudah mentok di bawah.
 *
 * Tanpa ini setiap musuh yang punya garis pandang akan menembak sama tepatnya
 * dari seberang arena seperti dari jarak satu meter, dan pemain tidak pernah
 * punya alasan menjaga jarak. Dengan pelemahan ini, mundur ke kejauhan
 * benar-benar menurunkan tekanan.
 */
const FALLOFF_START = 8;
const FALLOFF_END = 30;
/** Sisa ketepatan pada jarak terjauh, sebagai pecahan dari ketepatan penuh. */
const FALLOFF_FLOOR = 0.35;

/** Bagian dari tembakan yang kena dan mengarah ke kepala. */
export const HEADSHOT_SHARE = 0.16;

/**
 * Peluang satu tembakan musuh mengenai pemain pada jarak tertentu.
 *
 * Ketepatan dasar datang dari profil kesulitan — itulah yang paling terasa
 * membedakan Santai dari Susah — lalu dilemahkan oleh jarak.
 */
export function hitChance(profile: DifficultyProfile, distance: number): number {
  const span = FALLOFF_END - FALLOFF_START;
  const past = Math.max(0, Math.min(span, distance - FALLOFF_START));
  const falloff = 1 - (1 - FALLOFF_FLOOR) * (past / span);
  return profile.accuracy * falloff;
}

/**
 * Perenggang jeda tembak terhadap angka pada profil kesulitan.
 *
 * Angka di profil menggambarkan seberapa sering seorang penembak mahir sempat
 * membidik, dan dipakai mentah-mentah angka itu membuat pertandingan habis
 * sebelum sempat dirasakan: satu musuh Susah menumbangkan pemain bernyawa
 * penuh dalam enam detik, dan tiga musuh sekaligus dalam dua detik. Perenggang
 * ini memberi ruang untuk bereaksi, mencari perlindungan, dan membalas —
 * tanpa mengubah perbandingan antar tingkat kesulitan, karena dikenakan sama
 * rata.
 */
const AIM_PACE = 2.4;

/**
 * Kerusakan senjata yang dijadikan patokan laju tembak, yaitu senapan serbu.
 *
 * Kerusakan antar senjata berbeda sampai enam kali lipat, dari 18 sampai 110.
 * Kalau semua musuh menembak dengan jeda yang sama, musuh bersenapan runduk
 * jadi jauh lebih mematikan daripada musuh ber-SMG hanya karena undian senjata
 * saat pertandingan disusun, bukan karena tingkat kesulitan yang dipilih
 * pemain. Karena itu jeda tembak diskalakan terhadap kerusakan senjatanya:
 * yang memukul keras menembak lebih jarang. Watak tiap senjata tetap terasa —
 * senapan runduk tetap menyakitkan sekali kena — sementara tekanan totalnya
 * sebanding.
 */
const REFERENCE_DAMAGE = 33;

/**
 * Jeda menuju tembakan berikutnya untuk SATU musuh, dalam detik.
 *
 * Tiap musuh punya jamnya sendiri, jadi angka profil dipakai sebagaimana
 * ditulis untuk satu musuh, lalu direnggangkan dan diskalakan terhadap senjata
 * yang dibawanya.
 */
export function nextFireDelay(
  profile: DifficultyProfile,
  weaponDamage: number,
  random: () => number = Math.random,
): number {
  const [min, max] = profile.fireIntervalSeconds;
  const base = min + random() * (max - min);
  return base * AIM_PACE * (weaponDamage / REFERENCE_DAMAGE);
}

/** Rata-rata jeda tembak satu musuh, tanpa undian. */
export function averageFireDelay(
  profile: DifficultyProfile,
  weaponDamage: number,
): number {
  const [min, max] = profile.fireIntervalSeconds;
  return ((min + max) / 2) * AIM_PACE * (weaponDamage / REFERENCE_DAMAGE);
}

/** Kerusakan per menit yang bisa ditimbulkan satu musuh pada jarak tertentu. */
export function damagePerMinute(
  profile: DifficultyProfile,
  weaponDamage: number,
  distance: number,
): number {
  const shotsPerMinute = 60 / averageFireDelay(profile, weaponDamage);
  return shotsPerMinute * hitChance(profile, distance) * weaponDamage;
}
