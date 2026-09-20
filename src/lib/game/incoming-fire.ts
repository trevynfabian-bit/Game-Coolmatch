import type { Aabb } from "@/lib/game/collision";
import { HEADSHOT_SHARE, aimFactor, hitChance } from "@/lib/game/bot-combat";
import { resolveShotDamage } from "@/lib/game/damage";
import type { DifficultyProfile } from "@/lib/game/difficulty";
import { FIGHTER_HITBOX, rayHitsAabb } from "@/lib/game/shooting";
import type { Vec3, Weapon, WeaponType } from "@/types/game";

/**
 * Tembakan MASUK: satu peluru dari seorang penembak ke arah pemain, dihitung
 * dari keadaan penembak yang sungguhan — di mana ia berdiri, senjata apa yang
 * dibawanya, seberapa tepat bidikannya — bukan dari undian yang tidak tahu
 * apa-apa soal arena.
 *
 * Murni dan tanpa efek samping, seperti aturan tembak lainnya, supaya bisa
 * diperiksa tanpa browser: berapa persen yang kena pada jarak tertentu,
 * berapa bagian yang mengenai kepala, seberapa jauh kerusakan meluruh, dan
 * bahwa krat rendah benar-benar melindungi bagian badan yang ada di
 * baliknya. Penggerak musuh memakainya untuk setiap tembakan bot; penembak
 * lain yang datang kemudian tinggal memberi keadaan yang sama.
 */
export interface IncomingShooter {
  /** Posisi telapak kaki penembak. */
  position: Vec3;
  /** Tinggi mata penembak dari telapak kakinya; dari sinilah peluru berangkat. */
  eyeHeight: number;
  weapon: Weapon;
  profile: DifficultyProfile;
  /** Selisih arah moncong terhadap arah ke sasaran, dalam radian. */
  aimOffRadians: number;
}

export interface IncomingShotInput {
  shooter: IncomingShooter;
  /** Posisi telapak kaki sasaran. */
  target: Vec3;
  /** Penghalang peta; badan petarung lain sengaja tidak ikut. */
  colliders: Aabb[];
  random?: () => number;
}

export interface IncomingShotResult {
  /** Benar bila peluru mengenai sasaran dan menimbulkan kerusakan. */
  hit: boolean;
  /**
   * Benar bila bidikannya sebetulnya tepat, tetapi peluru berhenti di
   * penghalang peta sebelum sampai — berlindung di balik krat berarti bagian
   * badan yang tersembunyi tidak bisa kena.
   */
  blocked: boolean;
  isHeadshot: boolean;
  /** Kerusakan mentah sesudah pelemahan jarak dan pengali kepala; nol bila meleset. */
  damage: number;
  /** Jarak mendatar penembak ke sasaran, satuan dunia. */
  distance: number;
  /** Titik pada badan sasaran yang dibidik peluru ini. */
  aimPoint: Vec3;
}

/**
 * Pelemahan kerusakan menurut jarak, per jenis senjata.
 *
 * Peluru kena tidak selalu berarti kerusakan penuh: sebaran shotgun buyar
 * sesudah beberapa langkah, peluru pistol dan SMG kehilangan tenaga, senapan
 * serbu sedikit, dan senapan runduk sama sekali tidak. Sampai `full` satuan
 * kerusakannya utuh, lalu meluruh lurus sampai `floor` pada jangkauan
 * efektif senjata (`far`). Angkanya mengikuti kata jarak pada halaman Pilih
 * Senjata, dan membuat menjauh dari musuh bershotgun benar-benar menolong —
 * sebelumnya satu butir shotgun menghilangkan 82 nyawa dari sebelas satuan
 * sama seperti dari satu satuan.
 */
const FALLOFF: Record<
  WeaponType,
  { full: number; far: number; floor: number }
> = {
  shotgun: { full: 5, far: 11, floor: 0.35 },
  pistol: { full: 10, far: 20, floor: 0.7 },
  smg: { full: 10, far: 20, floor: 0.6 },
  rifle: { full: 20, far: 34, floor: 0.8 },
  sniper: { full: Infinity, far: Infinity, floor: 1 },
};

/** Pengali kerusakan sebuah senjata pada jarak tertentu, 0..1. */
export function damageFalloff(weapon: Weapon, distance: number): number {
  const { full, far, floor } = FALLOFF[weapon.type];
  if (distance <= full) return 1;
  if (distance >= far) return floor;
  return 1 - (1 - floor) * ((distance - full) / (far - full));
}

/**
 * Titik bidik pada badan sasaran. Bagian kepala dipilih sebesar
 * `HEADSHOT_SHARE`, sisanya badan; di dalam tiap zona titiknya diundi merata
 * supaya peluru yang datang dari sudut berbeda memang mengenai tempat yang
 * berbeda — itulah yang membuat krat rendah melindungi kaki tetapi tidak
 * melindungi kepala.
 */
export function pickAimPoint(
  target: Vec3,
  random: () => number,
): { point: Vec3; isHeadshot: boolean } {
  const { radius, height, headZone } = FIGHTER_HITBOX;
  const isHeadshot = random() < HEADSHOT_SHARE;
  const headMin = height - headZone;
  const y = isHeadshot
    ? headMin + random() * headZone
    : 0.2 + random() * (headMin - 0.2);
  // Sedikit ke dalam dari tepi kotak supaya titiknya benar-benar di badan.
  const inset = radius * 0.7;
  return {
    point: [
      target[0] + (random() * 2 - 1) * inset,
      target[1] + y,
      target[2] + (random() * 2 - 1) * inset,
    ],
    isHeadshot,
  };
}

/**
 * Satu peluru dari penembak ke pemain.
 *
 * Dua tahap. Pertama BIDIKAN: peluang kena dari ketepatan profil, dilemahkan
 * jarak dan seberapa jauh moncong masih melenceng; kalau undiannya meleset,
 * peluru lewat. Kedua LINTASAN: peluru yang terbidik diarahkan ke satu titik
 * nyata di badan sasaran dan ditelusuri melewati penghalang peta — krat,
 * tembok, drum — dan berhenti di penghalang pertama yang lebih dekat dari
 * titik itu. Garis pandang ke dada yang terbuka tidak berarti seluruh badan
 * terbuka.
 */
export function resolveIncomingShot(
  input: IncomingShotInput,
): IncomingShotResult {
  const { shooter, target, colliders, random = Math.random } = input;
  const distance = Math.hypot(
    target[0] - shooter.position[0],
    target[2] - shooter.position[2],
  );
  const { point, isHeadshot } = pickAimPoint(target, random);
  const meleset: IncomingShotResult = {
    hit: false,
    blocked: false,
    isHeadshot: false,
    damage: 0,
    distance,
    aimPoint: point,
  };

  const chance =
    hitChance(shooter.profile, distance) * aimFactor(shooter.aimOffRadians);
  if (random() >= chance) return meleset;

  const origin: Vec3 = [
    shooter.position[0],
    shooter.position[1] + shooter.eyeHeight,
    shooter.position[2],
  ];
  const dx = point[0] - origin[0];
  const dy = point[1] - origin[1];
  const dz = point[2] - origin[2];
  const length = Math.hypot(dx, dy, dz);
  if (length > 1e-6) {
    const direction: Vec3 = [dx / length, dy / length, dz / length];
    for (const box of colliders) {
      const t = rayHitsAabb(origin, direction, box, length);
      if (t !== null && t < length) return { ...meleset, blocked: true };
    }
  }

  // Dibulatkan ke poin utuh: pelemahan jarak menghasilkan pecahan panjang,
  // dan HUD menampilkan nyawa apa adanya — "84,655" bukan bacaan untuk
  // pertarungan. Sekurang-kurangnya satu poin, supaya peluru yang kena
  // tidak pernah tercatat sebagai tidak terjadi apa-apa.
  const base = Math.max(
    1,
    Math.round(shooter.weapon.damage * damageFalloff(shooter.weapon, distance)),
  );
  return {
    hit: true,
    blocked: false,
    isHeadshot,
    damage: resolveShotDamage(base, isHeadshot),
    distance,
    aimPoint: point,
  };
}

/**
 * Sudut datangnya tembakan relatif arah hadap sasaran, dalam radian, untuk
 * busur penunjuk di layar: nol berarti tepat dari depan. Tanda dan
 * normalisasinya persis seperti yang dipakai busur sejak awal.
 */
export function incomingAngle(
  facingYaw: number,
  target: Vec3,
  shooter: Vec3,
): number {
  const toShooter = Math.atan2(shooter[0] - target[0], shooter[2] - target[2]);
  return Math.atan2(
    Math.sin(facingYaw - toShooter),
    Math.cos(facingYaw - toShooter),
  );
}
