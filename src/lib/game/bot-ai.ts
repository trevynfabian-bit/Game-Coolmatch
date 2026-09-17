import { MOVEMENT } from "@/lib/game/controls";
import { movePlayer } from "@/lib/game/collision";
import type {
  Aabb,
  PlayerBounds,
  PlayerPosition,
} from "@/lib/game/collision";
import type { DifficultyProfile } from "@/lib/game/difficulty";
import type { ArenaBounds, Vec3 } from "@/types/game";

/**
 * Otak satu musuh otomatis: bagaimana ia memutuskan ke mana melangkah tiap
 * frame. Sengaja dipisah dari komponen React supaya bisa diperiksa tanpa
 * browser — langkahnya murni, semua yang berubah dikembalikan sebagai nilai.
 *
 * Gerak akhirnya dikerjakan `movePlayer`, resolver tabrakan yang sama persis
 * dengan yang dipakai pemain. Musuh karena itu tidak bisa menembus krat,
 * menembus tembok, atau melayang keluar arena, dan ia menaiki undakan dengan
 * aturan yang sama.
 */

/** Musuh berjalan sedikit lebih lambat dari pemain, jadi pemain bisa kabur. */
const CHASE_SPEED = MOVEMENT.walkSpeed * 0.78;
/** Saat menyerbu dari jauh, musuh yang berani boleh berlari. */
const RUSH_SPEED = MOVEMENT.walkSpeed * 0.95;
/** Kecepatan saat berkeliling tanpa tahu di mana pemain. */
const ROAM_SPEED = MOVEMENT.walkSpeed * 0.55;

/**
 * Jarak yang ingin dijaga musuh terhadap pemain, dalam satuan dunia.
 *
 * Makin berani, makin dekat ia mau berdiri: Santai berhenti jauh dan menembak
 * dari seberang, Susah menempel. Pita `RANGE_BAND` mencegah musuh maju-mundur
 * gelisah tepat di garis batas — ia baru mendekat lagi setelah pemain menjauh
 * melewati pita itu.
 */
const FAR_RANGE = 17;
const NEAR_RANGE = 7;
const RANGE_BAND = 2.5;

/** Lama satu simpangan jelajah dipertahankan sebelum diganti, dalam detik. */
const ROAM_MIN_SECONDS = 1.4;
const ROAM_MAX_SECONDS = 3.2;

/**
 * Seberapa miring musuh boleh berjalan dari arah lurus ke pemain saat ia belum
 * melihat pemain, dalam radian.
 *
 * Musuh yang belum melihat pemain tetap MENDEKAT, bukan berkeliaran asal.
 * Berjalan acak di gudang seluas ini hampir tidak pernah membawa mereka ke
 * sudut tempat pemain berdiri, sehingga arena terasa kosong dan pemain yang
 * diam tidak pernah didatangi. Simpangan ini yang membuat jalannya tidak lurus
 * seperti rel: mereka datang dari arah yang berbeda-beda dan sesekali memutar,
 * lalu mengunci sasaran begitu garis pandang terbuka.
 */
const ROAM_SPREAD = 1.15;

/** Seberapa cepat arah hadap menyusul arah yang dituju, per detik. */
const TURN_RATE = 6.5;

/** Ingatan sesaat tiap musuh; hanya berarti selama satu ronde berjalan. */
export interface BotBrain {
  /**
   * Lama pemain berada dalam garis pandang tanpa putus, dalam detik. Musuh
   * baru bertindak setelah angka ini melewati `reactionSeconds` profilnya —
   * itulah yang membuat Santai terasa lamban dan Susah terasa sigap.
   */
  seenSeconds: number;
  /** Sisa waktu simpangan jelajah sekarang, dalam detik. */
  roamSeconds: number;
  /** Simpangan arah terhadap garis lurus ke pemain, dalam radian. */
  roamOffset: number;
}

export interface BotStepInput {
  position: PlayerPosition;
  /** Arah hadap sekarang, dalam radian. */
  yaw: number;
  verticalVelocity: number;
  brain: BotBrain;
  /** Posisi pemain yang dikejar. */
  target: Vec3;
  /** Benar bila garis pandang ke pemain sedang terbuka. */
  canSeeTarget: boolean;
  profile: DifficultyProfile;
  colliders: Aabb[];
  bounds: PlayerBounds;
  arena?: ArenaBounds;
  delta: number;
  /** Disuntikkan supaya pemeriksaan bisa dibuat pasti. */
  random?: () => number;
}

export interface BotStepResult {
  position: PlayerPosition;
  yaw: number;
  verticalVelocity: number;
  brain: BotBrain;
  /** Benar bila musuh sedang benar-benar mengejar pemain. */
  engaged: boolean;
}

/** Jarak yang ingin dijaga musuh, diturunkan dari keberanian profilnya. */
export function preferredRange(profile: DifficultyProfile): number {
  return FAR_RANGE - (FAR_RANGE - NEAR_RANGE) * profile.aggression;
}

/** Simpangan jelajah baru beserta lamanya. */
export function rollRoam(
  random: () => number,
): Pick<BotBrain, "roamSeconds" | "roamOffset"> {
  return {
    roamOffset: (random() * 2 - 1) * ROAM_SPREAD,
    roamSeconds: ROAM_MIN_SECONDS + random() * (ROAM_MAX_SECONDS - ROAM_MIN_SECONDS),
  };
}

/** Otak kosong untuk musuh yang baru muncul. */
export function freshBrain(random: () => number = Math.random): BotBrain {
  return { seenSeconds: 0, ...rollRoam(random) };
}

/** Sudut terpendek dari `from` ke `to`, dinormalkan ke -PI..PI. */
function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * Satu langkah otak musuh.
 *
 * Urutannya: perbarui ingatan garis pandang, tentukan arah yang diinginkan,
 * lalu serahkan perpindahannya ke resolver tabrakan. Arah hadap menyusul arah
 * gerak secara halus, bukan mematah, supaya musuh tidak terlihat berputar
 * seketika saat pemain bergerak.
 */
export function stepBot(input: BotStepInput): BotStepResult {
  const {
    position,
    yaw,
    verticalVelocity,
    target,
    canSeeTarget,
    profile,
    colliders,
    bounds,
    arena,
    delta,
    random = Math.random,
  } = input;

  // Garis pandang yang putus menghapus ingatan: musuh harus melihat ulang
  // sebelum kembali mengejar, persis seperti saat pertama kali menyadari.
  const seenSeconds = canSeeTarget ? input.brain.seenSeconds + delta : 0;
  const engaged = canSeeTarget && seenSeconds >= profile.reactionSeconds;

  const toTargetX = target[0] - position.x;
  const toTargetZ = target[2] - position.z;
  const distance = Math.hypot(toTargetX, toTargetZ);

  let roamSeconds = input.brain.roamSeconds - delta;
  let roamOffset = input.brain.roamOffset;
  let headingX = 0;
  let headingZ = 0;
  let speed = 0;

  if (engaged && distance > 0.001) {
    const want = preferredRange(profile);
    const toward = { x: toTargetX / distance, z: toTargetZ / distance };

    if (distance > want + RANGE_BAND) {
      // Terlalu jauh: mendekat. Yang berani menyerbu lebih cepat.
      headingX = toward.x;
      headingZ = toward.z;
      speed = profile.aggression >= 0.6 ? RUSH_SPEED : CHASE_SPEED;
    } else if (distance < want - RANGE_BAND) {
      // Terlalu dekat: mundur sambil tetap menghadap pemain.
      headingX = -toward.x;
      headingZ = -toward.z;
      speed = CHASE_SPEED;
    } else {
      // Pada jarak yang pas: bergeser menyamping supaya tidak jadi sasaran diam.
      headingX = -toward.z;
      headingZ = toward.x;
      speed = CHASE_SPEED * 0.6;
    }
  } else {
    // Belum melihat pemain: tetap mendekat, tetapi lewat jalan yang berbelok.
    // Simpangannya diganti tiap kali waktunya habis, jadi musuh datang dari
    // arah yang berubah-ubah alih-alih berbaris lurus.
    if (roamSeconds <= 0) {
      const rolled = rollRoam(random);
      roamOffset = rolled.roamOffset;
      roamSeconds = rolled.roamSeconds;
    }
    const towardTarget =
      distance > 0.001 ? Math.atan2(toTargetX, toTargetZ) : roamOffset;
    const heading = towardTarget + roamOffset;
    headingX = Math.sin(heading);
    headingZ = Math.cos(heading);
    speed = ROAM_SPEED;
  }

  const moved = movePlayer(
    position,
    {
      dx: headingX * speed * delta,
      dy: verticalVelocity * delta,
      dz: headingZ * speed * delta,
    },
    verticalVelocity - MOVEMENT.gravity * delta,
    colliders,
    bounds,
    arena,
  );

  // Menabrak dinding saat menjelajah berarti simpangan itu buntu — ambil yang
  // lain pada frame berikutnya alih-alih terus mendorong tembok.
  if (moved.blocked && !engaged) {
    roamSeconds = 0;
  }

  // Saat mengejar, musuh menghadap pemain; saat berkeliling, menghadap arah
  // jalannya. Putarannya dibatasi TURN_RATE supaya terlihat wajar.
  const wantYaw = engaged
    ? Math.atan2(toTargetX, toTargetZ)
    : Math.atan2(headingX, headingZ);
  const turn = angleDelta(yaw, wantYaw);
  const maxTurn = TURN_RATE * delta;

  return {
    position: moved.position,
    verticalVelocity: moved.verticalVelocity,
    yaw: yaw + Math.max(-maxTurn, Math.min(maxTurn, turn)),
    brain: { seenSeconds, roamSeconds, roamOffset },
    engaged,
  };
}
