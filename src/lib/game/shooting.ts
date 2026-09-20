import type { Aabb } from "@/lib/game/collision";
import type { Fighter, Vec3, Weapon } from "@/types/game";

/** Jarak tempuh maksimum satu peluru hitscan, dalam satuan dunia. */
export const MAX_SHOT_DISTANCE = 140;

/** Ukuran kotak tabrakan satu petarung, dipakai untuk mendeteksi kena tembak. */
const FIGHTER_RADIUS = 0.42;
const FIGHTER_HEIGHT = 1.97;
/** Bagian teratas badan yang dihitung sebagai kepala. */
const HEAD_ZONE = 0.36;

/**
 * Kotak badan petarung yang sama, dibuka untuk tembakan MASUK: peluru musuh
 * dibidikkan ke titik di dalam kotak ini, jadi kepala dan badan yang bisa
 * dikenai musuh persis sama dengan yang bisa dikenai pemain.
 */
export const FIGHTER_HITBOX = {
  radius: FIGHTER_RADIUS,
  height: FIGHTER_HEIGHT,
  headZone: HEAD_ZONE,
} as const;

export interface FighterTarget {
  id: string;
  box: Aabb;
  /** Ketinggian dunia tempat zona kepala dimulai. */
  headMinY: number;
}

/**
 * Kotak sasaran untuk semua petarung yang masih hidup dan bukan pemain lokal.
 *
 * `positionOf` menjawab di mana seorang petarung BERADA SEKARANG. Bawaannya
 * posisi di store, yaitu tempat ia diletakkan; arena yang musuhnya berjalan
 * harus memberikan posisi hidupnya, sebab peluru yang diuji terhadap titik
 * spawn hanya mengenai musuh yang kebetulan masih berdiri di sana.
 */
export function buildFighterTargets(
  fighters: Fighter[],
  positionOf: (fighter: Fighter) => Vec3 = (fighter) => fighter.position,
): FighterTarget[] {
  return fighters
    .filter((fighter) => !fighter.isLocal && fighter.isAlive)
    .map((fighter) => {
      const [x, y, z] = positionOf(fighter);
      return {
        id: fighter.id,
        box: {
          minX: x - FIGHTER_RADIUS,
          minY: y,
          minZ: z - FIGHTER_RADIUS,
          maxX: x + FIGHTER_RADIUS,
          maxY: y + FIGHTER_HEIGHT,
          maxZ: z + FIGHTER_RADIUS,
        },
        headMinY: y + FIGHTER_HEIGHT - HEAD_ZONE,
      };
    });
}

/**
 * Jarak tempuh sinar sampai menyentuh kotak, memakai metode slab. Mengembalikan
 * null bila sinar meleset atau kotaknya ada di belakang titik asal.
 */
export function rayHitsAabb(
  origin: Vec3,
  direction: Vec3,
  box: Aabb,
  maxDistance: number,
): number | null {
  /*
    Balok yang diputar diuji di kerangkanya SENDIRI: sinarnya yang diputar
    balik, bukan baloknya yang dilebarkan. Tanpa ini peluru berhenti di sudut
    kotak pembungkus — ruang kosong yang pada krat tiga satuan bisa menjulur
    hampir empat puluh sentimeter melewati kratnya, dan pemain melihat
    tembakannya lenyap di udara tepat di samping penutup.

    Jaraknya tidak perlu diubah kembali: memutar tidak mengubah panjang, jadi
    jarak di kerangka balok sama persis dengan jarak di dunia.
  */
  if (box.oriented) {
    const { cx, cz, hx, hz, rot } = box.oriented;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const putar = (x: number, z: number): [number, number] => [
      x * cos - z * sin,
      x * sin + z * cos,
    ];
    const [ox, oz] = putar(origin[0] - cx, origin[2] - cz);
    const [dx, dz] = putar(direction[0], direction[2]);

    return rayHitsAabb(
      [ox, origin[1], oz],
      [dx, direction[1], dz],
      {
        minX: -hx,
        maxX: hx,
        minY: box.minY,
        maxY: box.maxY,
        minZ: -hz,
        maxZ: hz,
      },
      maxDistance,
    );
  }

  let tMin = 0;
  let tMax = maxDistance;

  const lo = [box.minX, box.minY, box.minZ];
  const hi = [box.maxX, box.maxY, box.maxZ];

  for (let axis = 0; axis < 3; axis++) {
    const o = origin[axis];
    const d = direction[axis];

    if (Math.abs(d) < 1e-8) {
      // Sinar sejajar sumbu ini: meleset kalau titik asal sudah di luar slab.
      if (o < lo[axis] || o > hi[axis]) return null;
      continue;
    }

    const inv = 1 / d;
    let tNear = (lo[axis] - o) * inv;
    let tFar = (hi[axis] - o) * inv;
    if (tNear > tFar) {
      const swap = tNear;
      tNear = tFar;
      tFar = swap;
    }

    if (tNear > tMin) tMin = tNear;
    if (tFar < tMax) tMax = tFar;
    if (tMin > tMax) return null;
  }

  return tMin;
}

export type ShotHitKind = "map" | "fighter";

export interface ShotHit {
  kind: ShotHitKind;
  distance: number;
  point: Vec3;
  fighterId?: string;
  isHeadshot?: boolean;
  /**
   * Urutan balok peta yang kena, sesuai urutan `colliders`. Hanya terisi saat
   * `kind` bernilai "map". Dipakai pemanggil untuk mengenali balok tertentu —
   * misalnya sasaran di tempat latihan — tanpa mengulang raycast.
   */
  blockIndex?: number;
}

/**
 * Menembakkan satu sinar ke arena dan mengembalikan sasaran terdekat. Petarung
 * diuji lebih dulu tetapi tetap kalah bila ada geometri peta yang lebih dekat,
 * sehingga menembak dari balik tembok tidak pernah kena.
 */
export function raycastArena(
  origin: Vec3,
  direction: Vec3,
  colliders: Aabb[],
  targets: FighterTarget[],
  maxDistance = MAX_SHOT_DISTANCE,
): ShotHit | null {
  let best: ShotHit | null = null;

  const consider = (
    distance: number | null,
    kind: ShotHitKind,
    fighterId?: string,
    headMinY?: number,
    blockIndex?: number,
  ) => {
    if (distance === null || distance < 0 || distance > maxDistance) return;
    if (best && distance >= best.distance) return;

    const point: Vec3 = [
      origin[0] + direction[0] * distance,
      origin[1] + direction[1] * distance,
      origin[2] + direction[2] * distance,
    ];

    best = {
      kind,
      distance,
      point,
      fighterId,
      isHeadshot:
        kind === "fighter" && headMinY !== undefined
          ? point[1] >= headMinY
          : undefined,
      blockIndex,
    };
  };

  colliders.forEach((collider, index) => {
    consider(
      rayHitsAabb(origin, direction, collider, maxDistance),
      "map",
      undefined,
      undefined,
      index,
    );
  });
  for (const target of targets) {
    consider(
      rayHitsAabb(origin, direction, target.box, maxDistance),
      "fighter",
      target.id,
      target.headMinY,
    );
  }

  return best;
}

/**
 * Menyimpangkan arah tembak di dalam kerucut sebaran. Sudutnya diacak dengan
 * akar kuadrat supaya titik jatuh merata di seluruh lingkaran, bukan menumpuk
 * di tengah.
 */
export function applySpread(
  direction: Vec3,
  spreadDegrees: number,
  random: () => number = Math.random,
): Vec3 {
  if (spreadDegrees <= 0) return direction;

  const maxAngle = (spreadDegrees * Math.PI) / 180;
  const angle = maxAngle * Math.sqrt(random());
  const roll = random() * Math.PI * 2;

  // Basis tegak lurus terhadap arah tembak.
  const [dx, dy, dz] = direction;
  const helper: Vec3 = Math.abs(dy) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  let ux = helper[1] * dz - helper[2] * dy;
  let uy = helper[2] * dx - helper[0] * dz;
  let uz = helper[0] * dy - helper[1] * dx;
  const uLen = Math.hypot(ux, uy, uz) || 1;
  ux /= uLen;
  uy /= uLen;
  uz /= uLen;

  const vx = dy * uz - dz * uy;
  const vy = dz * ux - dx * uz;
  const vz = dx * uy - dy * ux;

  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const offX = (ux * Math.cos(roll) + vx * Math.sin(roll)) * sin;
  const offY = (uy * Math.cos(roll) + vy * Math.sin(roll)) * sin;
  const offZ = (uz * Math.cos(roll) + vz * Math.sin(roll)) * sin;

  const rx = dx * cos + offX;
  const ry = dy * cos + offY;
  const rz = dz * cos + offZ;
  const len = Math.hypot(rx, ry, rz) || 1;

  return [rx / len, ry / len, rz / len];
}

/** Jeda minimal antar tembakan, diturunkan dari peluru per menit. */
export function shotInterval(weapon: Weapon): number {
  return 60 / Math.max(1, weapon.fireRate);
}

export interface SpreadInputs {
  weapon: Weapon;
  /** Kecepatan mendatar pemain dalam satuan dunia per detik. */
  planarSpeed: number;
  isAirborne: boolean;
  /** Tembakan beruntun yang belum sempat mereda. */
  bloom: number;
}

/** Sebaran maksimum yang bisa ditumpuk oleh tembakan beruntun. */
export const MAX_BLOOM_DEGREES = 4.5;

/**
 * Sebaran efektif saat ini: dasar senjata, ditambah hukuman karena bergerak dan
 * melayang, ditambah mekar akibat menembak beruntun.
 */
export function effectiveSpread({
  weapon,
  planarSpeed,
  isAirborne,
  bloom,
}: SpreadInputs): number {
  const movePenalty = Math.min(planarSpeed / 5.6, 1.6) * 1.9;
  const airPenalty = isAirborne ? 2.4 : 0;
  return weapon.spreadDegrees + movePenalty + airPenalty + bloom;
}
