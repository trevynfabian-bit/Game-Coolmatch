import type { DifficultyProfile } from "@/lib/game/difficulty";
import type { Weapon, WeaponType } from "@/types/game";

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
 * Seberapa melenceng arah hadap musuh masih dianggap terbidik, dalam radian.
 *
 * Di dalam AIM_ON_CONE bidikan dianggap tertuju penuh; di luar AIM_OFF_CONE
 * moncongnya jelas tidak mengarah ke pemain dan tembakannya pasti meleset.
 * Tanpa ini, musuh yang baru saja menyadari pemain di belakangnya bisa
 * menembak setepat musuh yang sudah lama membidik — badannya masih berputar di
 * layar, tetapi pelurunya sudah kena, dan itu terlihat seperti curang. Bersama
 * kecepatan bidik yang mengikuti tingkat kesulitan, inilah yang membuat Santai
 * betul-betul kalah cepat dalam adu bidik.
 */
const AIM_ON_CONE = 0.22;
const AIM_OFF_CONE = 1.05;

/**
 * Pengali peluang kena menurut seberapa jauh moncong musuh masih melenceng
 * dari pemain: 1 saat sudah terbidik, meluruh ke 0 saat jelas belum.
 */
export function aimFactor(offRadians: number): number {
  if (offRadians <= AIM_ON_CONE) return 1;
  if (offRadians >= AIM_OFF_CONE) return 0;
  return 1 - (offRadians - AIM_ON_CONE) / (AIM_OFF_CONE - AIM_ON_CONE);
}

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

/**
 * Jangkauan efektif tiap jenis senjata, dalam satuan dunia.
 *
 * Musuh tidak menembak dari luar jarak ini. Sebelumnya musuh berpistol
 * menembak dari seberang arena — pelurunya hampir selalu meleset karena
 * pelemahan jarak, tetapi ia tetap menembak, dan pemain yang berdiri empat
 * puluh satuan dari seorang musuh berpistol tetap merasa ditembaki. Angkanya
 * mengikuti kata jarak yang ditampilkan halaman Pilih Senjata: shotgun jarak
 * dekat, pistol dan SMG dekat sampai menengah, senapan serbu segala jarak,
 * senapan runduk jarak jauh.
 */
export const EFFECTIVE_RANGE: Record<WeaponType, number> = {
  shotgun: 11,
  pistol: 20,
  smg: 20,
  rifle: 34,
  sniper: 70,
};

/** Benar bila senjata ini masuk akal ditembakkan dari jarak tersebut. */
export function inFiringRange(weapon: Weapon, distance: number): boolean {
  return distance <= EFFECTIVE_RANGE[weapon.type];
}

/**
 * Berapa tembakan dilepas beruntun sebelum musuh berhenti sejenak.
 *
 * Rentetan pendek yang diikuti jeda adalah yang memberi pertarungan ritme:
 * ada saat untuk berlindung, dan ada saat untuk mengintip lalu membalas.
 * Angkanya sengaja kecil supaya satu rentetan tidak pernah menumbangkan
 * pemain bernyawa penuh sendirian — tiga peluru senapan serbu berjumlah 99,
 * tepat di bawah nyawa penuh. Senjata yang memukul keras menembak satu-satu:
 * tiap tembakannya sudah merupakan peristiwa tersendiri.
 */
export const BURST_SHOTS: Record<WeaponType, number> = {
  pistol: 2,
  smg: 3,
  rifle: 3,
  shotgun: 1,
  sniper: 1,
};

export function burstSize(weapon: Weapon): number {
  return BURST_SHOTS[weapon.type];
}

/**
 * Perapat jeda antar tembakan DI DALAM satu rentetan, sebagai pecahan dari
 * jeda bidik profil.
 *
 * Tanpa ini rentetan tidak terasa sebagai rentetan — tembakannya sama
 * jarangnya, hanya sesekali terputus. Waktu yang dihemat di dalam rentetan
 * dibayar kembali sebagai jeda napas sesudahnya (lihat `restAfterBurst`), jadi
 * tembakan per menit — dan dengan itu kerusakan per menit yang dijanjikan
 * profil kesulitan — tidak berubah; hanya sebarannya yang berubah.
 */
const BURST_TIGHTEN = 0.5;

/**
 * Lama musuh menahan diri sesudah satu rentetan, dalam detik.
 *
 * Dihitung supaya satu daur penuh — jeda bidik, rentetan, jeda napas — memakan
 * waktu yang sama dengan N tembakan pada jeda profil: N·D = D + (N−1)·D·rapat
 * + napas, sehingga napas = (N−1)·(1−rapat)·D. Senjata yang menembak
 * satu-satu tidak butuh napas; daurnya sudah sama dengan jeda profilnya.
 */
export function restAfterBurst(
  profile: DifficultyProfile,
  weapon: Weapon,
  random: () => number = Math.random,
): number {
  const shots = burstSize(weapon);
  if (shots <= 1) return 0;
  return (
    (shots - 1) *
    (1 - BURST_TIGHTEN) *
    nextFireDelay(profile, weapon.damage, random)
  );
}

/** Keadaan pelatuk SATU musuh; hanya berarti selama ia hidup. */
export interface FireState {
  /** Sisa tembakan pada rentetan ini. */
  burstLeft: number;
  /**
   * Saat tembakan berikutnya boleh dilepas, pada jam pemanggil. Nol berarti
   * belum dijadwalkan — musuh yang baru mengunci sasaran menunggu satu jeda
   * bidik penuh dulu, jadi ia tidak langsung menembak pada frame yang sama saat
   * pemain muncul di tikungan.
   */
  nextShotAt: number;
  /**
   * Saat jeda napas sesudah rentetan berakhir. Berjalan terus, terlihat atau
   * tidak sasarannya: pemain yang bersembunyi lalu mengintip lagi tidak
   * mempersingkatnya, dan tidak pula memperpanjangnya.
   */
  restUntil: number;
}

export function freshFireState(weapon: Weapon): FireState {
  return { burstLeft: burstSize(weapon), nextShotAt: 0, restUntil: 0 };
}

export interface FireStepInput {
  now: number;
  /** Benar bila musuh terlibat, punya garis pandang, dan dalam jangkauan. */
  canFire: boolean;
  profile: DifficultyProfile;
  weapon: Weapon;
  random?: () => number;
}

/**
 * Satu langkah pelatuk: memutuskan apakah musuh melepas tembakan SEKARANG.
 *
 * Murni dan tanpa efek samping, seperti otak geraknya — supaya ritme tembak
 * bisa diperiksa tanpa browser: berapa tembakan per rentetan, berapa lama
 * jeda napasnya, bahwa tembakan per menitnya sama dengan yang dijanjikan
 * profil, dan bahwa tidak ada satu pun tembakan dari luar jangkauan.
 */
export function stepFire(
  state: FireState,
  input: FireStepInput,
): { state: FireState; fire: boolean } {
  const { now, canFire, profile, weapon, random = Math.random } = input;

  if (now < state.restUntil) return { state, fire: false };

  if (!canFire) {
    // Kehilangan sasaran membatalkan kuncian; sisa rentetan dipertahankan.
    return state.nextShotAt === 0
      ? { state, fire: false }
      : { state: { ...state, nextShotAt: 0 }, fire: false };
  }

  if (state.nextShotAt === 0) {
    return {
      state: {
        ...state,
        nextShotAt: now + nextFireDelay(profile, weapon.damage, random),
      },
      fire: false,
    };
  }

  if (now < state.nextShotAt) return { state, fire: false };

  const burstLeft = state.burstLeft - 1;
  if (burstLeft <= 0) {
    return {
      state: {
        burstLeft: burstSize(weapon),
        nextShotAt: 0,
        restUntil: now + restAfterBurst(profile, weapon, random),
      },
      fire: true,
    };
  }
  return {
    state: {
      burstLeft,
      nextShotAt:
        now + nextFireDelay(profile, weapon.damage, random) * BURST_TIGHTEN,
      restUntil: 0,
    },
    fire: true,
  };
}
