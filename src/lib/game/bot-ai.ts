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
const FAR_RANGE = 14;
const NEAR_RANGE = 6;
const RANGE_BAND = 2.5;

/**
 * Lama musuh tetap memburu pemain setelah kehilangan garis pandang, dalam
 * detik.
 *
 * Tanpa ingatan ini, kesadaran musuh kembali nol setiap kali pemain lewat di
 * balik pilar atau krat — dan di gudang sepadat ini itu terjadi terus-menerus.
 * Akibatnya paling terasa pada Santai, yang butuh 1,1 detik penglihatan
 * beruntun: dalam percobaan satu menit ia tidak pernah sekali pun sempat
 * mengunci sasaran, sehingga arena terasa mati justru di tingkat yang paling
 * sering dipilih pemain baru.
 *
 * Ingatan ini hanya membuat musuh terus MEMBURU. Ia tetap tidak boleh menembak
 * tanpa garis pandang; syarat itu diperiksa terpisah saat menarik pelatuk.
 */
const MEMORY_SECONDS = 2.5;

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

/**
 * Jarak ke waypoint yang dianggap "sudah sampai", dalam satuan dunia.
 *
 * Cukup longgar. Waypoint dipakai sebagai titik spawn juga, dan beberapa di
 * antaranya berimpit dengan penghalang rendah; musuh yang menuntut sampai
 * persis di atas titiknya akan berputar-putar di depan krat selamanya.
 */
const ARRIVE_RADIUS = 1.6;

/**
 * Lama musuh menyusur samping saat tersangkut penghalang, dan batas total
 * tersangkut pada satu waypoint sebelum ia menyerah dan memilih yang lain.
 *
 * Tidak ada navmesh di sini, dan itu disengaja: peta-petanya kotak-kotak
 * sederhana, dan menyusur samping sudah cukup untuk melewati krat, pilar, dan
 * tembok setengah badan. Batas menyerah adalah jaring pengamannya — sudut
 * mati yang tidak terlewati tetap tidak boleh menjebak musuh sepanjang ronde.
 */
const DETOUR_SECONDS = 0.9;
const STUCK_GIVE_UP_SECONDS = 4;

/**
 * Jarak ketika seorang musuh mulai menjauhi musuh lain, dan seberapa kuat.
 *
 * Sejak musuh saling bertabrakan, dua musuh yang berpapasan di lorong sempit
 * bisa saling mengunci: masing-masing tertahan, masing-masing menyusur samping
 * ke arah yang sama, dan keduanya diam di tempat. Diukur di Silo Kembar, itu
 * membuat musuh berdiri diam enam belas persen dari waktunya. Pemisah ini
 * membelokkan mereka SEBELUM bersentuhan, jadi kuncian itu tidak pernah
 * terjadi. Pemain sengaja tidak termasuk: musuh yang menjauhi pemain adalah
 * musuh yang tidak pernah bisa mengejarnya.
 */
const SEPARATION_RADIUS = 2.2;
const SEPARATION_WEIGHT = 1.1;

/**
 * Patokan kecepatan bidik, dalam radian per detik dikali detik reaksi.
 *
 * Kecepatan bidik diturunkan dari waktu reaksi profil, bukan ditulis sendiri
 * per tingkat, supaya "kesigapan" hanya punya satu sumber kebenaran: musuh
 * yang lambat menyadari pemain juga lambat mengayunkan moncongnya. Santai
 * berputar sekitar 2,2 radian per detik — hampir satu detik untuk memutar
 * badan setengah lingkaran — sementara Susah mengunci hampir seketika.
 */
const AIM_SPEED_BASE = 2.4;

/** Kecepatan ayun bidikan musuh, dalam radian per detik. */
export function aimSpeed(profile: DifficultyProfile): number {
  return AIM_SPEED_BASE / profile.reactionSeconds;
}

/** Ingatan sesaat tiap musuh; hanya berarti selama satu ronde berjalan. */
export interface BotBrain {
  /**
   * Seberapa yakin musuh tahu di mana pemain, dalam detik. Naik selama pemain
   * terlihat dan turun saat tidak, bukan langsung nol — lihat MEMORY_SECONDS.
   * Musuh baru bertindak setelah angka ini melewati `reactionSeconds`
   * profilnya; itulah yang membuat Santai terasa lamban dan Susah terasa sigap.
   */
  seenSeconds: number;
  /** Sisa waktu simpangan jelajah sekarang, dalam detik. */
  roamSeconds: number;
  /** Simpangan arah terhadap garis lurus ke pemain, dalam radian. */
  roamOffset: number;
  /**
   * Waypoint yang sedang dituju saat berpatroli; -1 berarti belum memilih.
   * Indeks ke daftar waypoint milik peta, bukan posisinya, supaya otak tetap
   * kecil dan tidak menyalin apa pun yang sudah ada di peta.
   */
  waypoint: number;
  /** Sisa waktu menyusur samping setelah tersangkut, dan ke arah mana. */
  detourSeconds: number;
  detourSign: 1 | -1;
  /** Total waktu tersangkut saat menuju waypoint sekarang. */
  stuckSeconds: number;
  /**
   * Tempat pemain TERAKHIR TERLIHAT. Dipakai saat ingatan habis: patroli
   * dimulai dari waypoint terdekat ke titik ini, sehingga musuh yang kehilangan
   * pemain di tikungan terlihat mencari di sekitar tikungan itu — bukan
   * berbalik dan pergi seolah tidak pernah terjadi apa-apa.
   */
  lastSeen: Vec3 | null;
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
  /**
   * Titik-titik patroli peta. Bila kosong, musuh yang belum melihat pemain
   * kembali ke jelajah lama yang selalu condong ke arah pemain — dipertahankan
   * hanya sebagai cadangan, sebab condong ke pemain tanpa melihatnya adalah
   * cara halus untuk curang.
   */
  waypoints?: readonly Vec3[];
  /** Posisi musuh LAIN yang hidup, untuk dijauhi sedikit saat berdekatan. */
  others?: readonly Vec3[];
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
  /**
   * Selisih sudut antara arah hadap musuh dan arah ke pemain sesudah langkah
   * ini, dalam radian. Dipakai untuk menilai apakah bidikannya sudah benar-
   * benar tertuju ke pemain saat ia menarik pelatuk.
   */
  aimOffRadians: number;
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
  return {
    seenSeconds: 0,
    ...rollRoam(random),
    waypoint: -1,
    detourSeconds: 0,
    detourSign: 1,
    stuckSeconds: 0,
    lastSeen: null,
  };
}

/**
 * Memilih waypoint berikutnya untuk dipatroli.
 *
 * Tidak pernah waypoint yang sama, dan condong ke yang JAUH: dari sepuluh
 * titik, tiga yang terdekat dibuang. Patroli antar titik yang berdekatan
 * membuat musuh mondar-mandir di satu sudut arena, sementara yang membuat
 * arena terasa hidup adalah musuh yang menyeberanginya.
 */
export function pickWaypoint(
  waypoints: readonly Vec3[],
  from: PlayerPosition,
  current: number,
  random: () => number,
): number {
  if (waypoints.length === 0) return -1;
  if (waypoints.length === 1) return 0;

  const kandidat = waypoints
    .map((w, i) => ({ i, d: Math.hypot(w[0] - from.x, w[2] - from.z) }))
    .filter((k) => k.i !== current)
    .sort((a, b) => a.d - b.d);
  const buang = Math.min(kandidat.length - 1, Math.floor(kandidat.length * 0.3));
  const jauh = kandidat.slice(buang);
  return jauh[Math.floor(random() * jauh.length)].i;
}

/** Indeks waypoint yang paling dekat dengan sebuah titik. */
function nearestWaypoint(waypoints: readonly Vec3[], to: Vec3): number {
  let best = -1;
  let bestD = Infinity;
  waypoints.forEach((w, i) => {
    const d = Math.hypot(w[0] - to[0], w[2] - to[2]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
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
    waypoints = [],
    others = [],
    random = Math.random,
  } = input;

  // Kesadaran naik selama pemain terlihat dan luruh saat tidak. Batas atasnya
  // menentukan berapa lama ingatan itu bertahan setelah pemain menghilang:
  // musuh yang sempat menatap penuh masih memburu selama MEMORY_SECONDS, lalu
  // menyerah dan kembali menjelajah.
  const awarenessCap = profile.reactionSeconds + MEMORY_SECONDS;
  const seenSeconds = canSeeTarget
    ? Math.min(awarenessCap, input.brain.seenSeconds + delta)
    : Math.max(0, input.brain.seenSeconds - delta);
  const engaged = seenSeconds >= profile.reactionSeconds;
  const wasEngaged = input.brain.seenSeconds >= profile.reactionSeconds;
  // Tempat pemain terakhir terlihat hanya diperbarui saat ia BENAR-BENAR
  // terlihat, bukan tiap frame. Kalau diperbarui tiap frame, musuh yang
  // kehilangan pemain di tikungan tetap tahu ke mana ia pergi sesudahnya.
  const lastSeen: Vec3 | null = canSeeTarget ? [...target] : input.brain.lastSeen;

  const toTargetX = target[0] - position.x;
  const toTargetZ = target[2] - position.z;
  const distance = Math.hypot(toTargetX, toTargetZ);

  let roamSeconds = input.brain.roamSeconds - delta;
  let roamOffset = input.brain.roamOffset;
  let waypoint = input.brain.waypoint;
  let detourSeconds = Math.max(0, input.brain.detourSeconds - delta);
  let detourSign = input.brain.detourSign;
  let stuckSeconds = input.brain.stuckSeconds;
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
  } else if (waypoints.length > 0) {
    /*
      Berpatroli antar waypoint. Musuh yang belum melihat pemain TIDAK boleh
      tahu di mana pemain berada; ia menjelajahi arena lewat titik-titiknya,
      dan pertemuan terjadi karena keduanya sama-sama bergerak — bukan karena
      musuh diam-diam ditarik ke arah pemain.

      Satu pengecualian yang justru membuatnya terasa cerdas: saat ingatan
      baru saja habis, patroli dimulai dari waypoint terdekat ke tempat pemain
      terakhir terlihat. Musuh tampak mencari di sekitar tikungan tempat ia
      kehilangan jejak, lalu menyerah dan melanjutkan rondanya.
    */
    if (wasEngaged && lastSeen) {
      waypoint = nearestWaypoint(waypoints, lastSeen);
      stuckSeconds = 0;
    }
    if (waypoint < 0 || waypoint >= waypoints.length) {
      waypoint = pickWaypoint(waypoints, position, -1, random);
      stuckSeconds = 0;
    }

    const tujuan = waypoints[waypoint];
    const dxW = tujuan[0] - position.x;
    const dzW = tujuan[2] - position.z;
    const jarakW = Math.hypot(dxW, dzW);

    if (jarakW <= ARRIVE_RADIUS || stuckSeconds >= STUCK_GIVE_UP_SECONDS) {
      waypoint = pickWaypoint(waypoints, position, waypoint, random);
      stuckSeconds = 0;
      detourSeconds = 0;
    }

    const t = waypoints[waypoint];
    const dx = t[0] - position.x;
    const dz = t[2] - position.z;
    const jarak = Math.hypot(dx, dz) || 1;
    const lurusX = dx / jarak;
    const lurusZ = dz / jarak;

    if (detourSeconds > 0) {
      // Menyusur samping: tegak lurus terhadap arah tujuan, sedikit condong
      // maju supaya ia tidak sekadar mondar-mandir di depan penghalang.
      headingX = -lurusZ * detourSign + lurusX * 0.35;
      headingZ = lurusX * detourSign + lurusZ * 0.35;
      const n = Math.hypot(headingX, headingZ) || 1;
      headingX /= n;
      headingZ /= n;
    } else {
      headingX = lurusX;
      headingZ = lurusZ;
    }
    speed = ROAM_SPEED;
  } else {
    // Cadangan bila peta tidak punya waypoint: mendekat lewat jalan berbelok.
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

  // Menjauhi musuh lain yang terlalu dekat. Hanya arahnya yang dibelokkan;
  // kecepatannya tetap, jadi patroli tidak melambat hanya karena ramai.
  if (speed > 0 && others.length > 0) {
    let awayX = 0;
    let awayZ = 0;
    for (const o of others) {
      const ox = position.x - o[0];
      const oz = position.z - o[2];
      const d = Math.hypot(ox, oz);
      if (d < 0.001 || d >= SEPARATION_RADIUS) continue;
      const w = (1 - d / SEPARATION_RADIUS) * SEPARATION_WEIGHT;
      awayX += (ox / d) * w;
      awayZ += (oz / d) * w;
    }
    const gabungX = headingX + awayX;
    const gabungZ = headingZ + awayZ;
    const n = Math.hypot(gabungX, gabungZ);
    if (n > 0.001) {
      headingX = gabungX / n;
      headingZ = gabungZ / n;
    }
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
    if (waypoints.length > 0) {
      stuckSeconds += delta;
      if (detourSeconds <= 0) {
        // Arah susurnya diundi sekali per sangkutan, lalu dipertahankan.
        // Mengundi tiap frame membuat musuh bergetar di tempat.
        detourSign = random() < 0.5 ? -1 : 1;
        detourSeconds = DETOUR_SECONDS;
      }
    }
  }

  // Saat mengejar, musuh menghadap pemain; saat berkeliling, menghadap arah
  // jalannya. Putarannya dibatasi TURN_RATE supaya terlihat wajar.
  const wantYaw = engaged
    ? Math.atan2(toTargetX, toTargetZ)
    : Math.atan2(headingX, headingZ);
  const turn = angleDelta(yaw, wantYaw);
  const maxTurn = aimSpeed(profile) * delta;

  const nextYaw = yaw + Math.max(-maxTurn, Math.min(maxTurn, turn));
  // Diukur dari posisi SESUDAH melangkah, karena di situlah musuh berada saat
  // pelatuk ditarik pada frame ini. Memakai posisi sebelumnya membuat sudut
  // yang dilaporkan meleset satu frame, dan selisihnya paling besar justru
  // saat musuh sedang bergerak cepat mengapit pemain.
  const towardTargetYaw = Math.atan2(
    target[0] - moved.position.x,
    target[2] - moved.position.z,
  );

  return {
    position: moved.position,
    verticalVelocity: moved.verticalVelocity,
    yaw: nextYaw,
    brain: {
      seenSeconds,
      roamSeconds,
      roamOffset,
      waypoint,
      detourSeconds,
      detourSign,
      stuckSeconds,
      lastSeen,
    },
    engaged,
    aimOffRadians: Math.abs(angleDelta(nextYaw, towardTargetYaw)),
  };
}
