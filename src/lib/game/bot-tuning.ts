import type { DifficultyProfile } from "@/lib/game/difficulty";
import { MOVEMENT } from "@/lib/game/controls";

/**
 * Peta dari profil kesulitan ke angka-angka perilaku musuh.
 *
 * Profil hanya menyimpan empat sifat yang dipahami pemain: reaksi, ketepatan,
 * jeda tembak, dan keberanian. Semua yang dirasakan di arena — seberapa cepat
 * musuh berbalik, sedekat apa ia berani berdiri, berapa lama ia terus memburu
 * sesudah kehilangan jejak, secepat apa ia mendekat — diturunkan DI SINI, dan
 * hanya di sini, dari keempat sifat itu. Otak gerak dan aturan tembak membaca
 * hasilnya; tidak satu pun dari keduanya menyimpan tabel per tingkatnya
 * sendiri, jadi menaikkan keberanian Normal di profil mengubah semua
 * turunannya sekaligus dan tidak ada yang tertinggal.
 */
export interface BotTuning {
  /** Detik penglihatan beruntun sebelum musuh bertindak. */
  reactionSeconds: number;
  /** Lama musuh terus memburu sesudah kehilangan pandangan, dalam detik. */
  memorySeconds: number;
  /** Kecepatan ayun bidikan dan putar badan, radian per detik. */
  turnSpeed: number;
  /** Jarak yang ingin dijaga terhadap pemain, satuan dunia. */
  preferredRange: number;
  /** Kecepatan mendekat saat pemain terlalu jauh, satuan dunia per detik. */
  approachSpeed: number;
  /** Kecepatan menyamping pada jarak yang pas. */
  strafeSpeed: number;
  /** Kecepatan berpatroli saat belum melihat pemain. */
  roamSpeed: number;
  /** Peluang satu tembakan kena pada jarak dekat, sebelum pelemahan jarak. */
  accuracy: number;
}

/**
 * Jarak yang ingin dijaga musuh, dalam satuan dunia.
 *
 * Makin berani, makin dekat ia mau berdiri: Santai berhenti jauh dan menembak
 * dari seberang, Susah menempel.
 */
const FAR_RANGE = 14;
const NEAR_RANGE = 6;

/**
 * Ingatan sesudah kehilangan pandangan: dasar untuk yang penakut, lalu
 * bertambah dengan keberanian. Musuh Santai menyerah dua detik sesudah pemain
 * lenyap di tikungan; Susah masih memburu tiga detik lebih.
 */
const MEMORY_BASE_SECONDS = 1.5;
const MEMORY_PER_AGGRESSION = 2;

/**
 * Patokan kecepatan bidik, dalam radian per detik dikali detik reaksi.
 *
 * Diturunkan dari waktu reaksi supaya "kesigapan" hanya punya satu sumber
 * kebenaran: musuh yang lambat menyadari pemain juga lambat mengayunkan
 * moncongnya. Santai berputar sekitar 2,2 radian per detik — hampir satu detik
 * untuk memutar badan setengah lingkaran — sementara Susah mengunci hampir
 * seketika.
 */
const AIM_SPEED_BASE = 2.4;

/** Musuh berjalan lebih lambat dari pemain, jadi pemain bisa kabur. */
const CHASE_SPEED = MOVEMENT.walkSpeed * 0.78;
/** Yang paling berani menyerbu hampir secepat pemain berjalan. */
const RUSH_SPEED = MOVEMENT.walkSpeed * 0.95;
/** Kecepatan saat berkeliling tanpa tahu di mana pemain. */
const ROAM_SPEED = MOVEMENT.walkSpeed * 0.55;
/** Menyamping pada jarak yang pas: cukup untuk tidak jadi sasaran diam. */
const STRAFE_FACTOR = 0.6;

/**
 * Keberanian di bawah angka ini tidak menambah kecepatan mendekat; di atas
 * angka kedua ia menyerbu sepenuh laju. Di antaranya bertambah lurus, jadi
 * Normal benar-benar berada di tengah, bukan menjadi Santai yang berdiri
 * lebih dekat.
 */
const RUSH_FROM_AGGRESSION = 0.25;
const RUSH_FULL_AGGRESSION = 0.8;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function botTuning(profile: DifficultyProfile): BotTuning {
  const rush = clamp01(
    (profile.aggression - RUSH_FROM_AGGRESSION) /
      (RUSH_FULL_AGGRESSION - RUSH_FROM_AGGRESSION),
  );
  return {
    reactionSeconds: profile.reactionSeconds,
    memorySeconds:
      MEMORY_BASE_SECONDS + MEMORY_PER_AGGRESSION * profile.aggression,
    turnSpeed: AIM_SPEED_BASE / profile.reactionSeconds,
    preferredRange: FAR_RANGE - (FAR_RANGE - NEAR_RANGE) * profile.aggression,
    approachSpeed: CHASE_SPEED + (RUSH_SPEED - CHASE_SPEED) * rush,
    strafeSpeed: CHASE_SPEED * STRAFE_FACTOR,
    roamSpeed: ROAM_SPEED,
    accuracy: profile.accuracy,
  };
}

/**
 * Tiga fakta ringkas tentang perilaku tingkat ini, untuk layar pengaturan:
 * angka yang benar-benar dipakai arena, dibahasakan supaya pemain tahu apa
 * yang akan ia hadapi tanpa membaca kode.
 */
export function describeTuning(profile: DifficultyProfile): string[] {
  const tuning = botTuning(profile);
  const detik = (value: number) => value.toFixed(1).replace(".", ",");
  return [
    `sadar dalam ${detik(tuning.reactionSeconds)} dtk`,
    `jaga jarak ${Math.round(tuning.preferredRange)} m`,
    `${Math.round(tuning.accuracy * 100)}% kena dari dekat`,
  ];
}
