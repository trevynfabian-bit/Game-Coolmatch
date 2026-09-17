import type { ArenaMapInfo, MapBlock, Vec3 } from "@/types/game";

/** Awalan id balok yang dianggap sasaran latihan. */
export const TARGET_PREFIX = "sasaran-";

export interface RangeTarget {
  id: string;
  /** Jarak dari titik berdiri pemain, dibulatkan ke meter terdekat. */
  distance: number;
  color: string;
}

const LANE_X = [-6, -2, 2, 6];
const LANE_Z = [-12, -22, -32, -44];
const TARGET_COLORS = ["#f97316", "#38bdf8", "#34d399", "#f43f5e"];

/** Titik berdiri pemain di tempat latihan. */
export const RANGE_SPAWN: Vec3 = [0, 0, 6];

/**
 * Sasaran berupa pelat berdiri di empat jarak berbeda, supaya pemain bisa
 * merasakan bagaimana sebaran dan sentakan tiap senjata berubah menurut jarak.
 */
const targetBlocks: MapBlock[] = LANE_X.map((x, index) => ({
  id: `${TARGET_PREFIX}${index + 1}`,
  kind: "wall" as const,
  position: [x, 1.15, LANE_Z[index]] as Vec3,
  size: [1.5, 2.3, 0.25] as Vec3,
  color: TARGET_COLORS[index],
}));

export const RANGE_TARGETS: RangeTarget[] = targetBlocks.map(
  (block, index) => ({
    id: block.id,
    distance: Math.round(
      Math.hypot(
        block.position[0] - RANGE_SPAWN[0],
        block.position[2] - RANGE_SPAWN[2],
      ),
    ),
    color: TARGET_COLORS[index],
  }),
);

/** Tiang penyangga di bawah tiap pelat, murni hiasan. */
const standBlocks: MapBlock[] = targetBlocks.map((block, index) => ({
  id: `tiang-${index + 1}`,
  kind: "pillar" as const,
  position: [block.position[0], 0.5, block.position[2]] as Vec3,
  size: [0.22, 1, 0.22] as Vec3,
  color: "#4a5361",
}));

const walls: MapBlock[] = [
  {
    id: "dinding-belakang",
    kind: "wall",
    position: [0, 4, -52],
    size: [40, 8, 1],
    color: "#4d5563",
  },
  {
    id: "dinding-kiri",
    kind: "wall",
    position: [-14, 4, -22],
    size: [1, 8, 62],
    color: "#4d5563",
  },
  {
    id: "dinding-kanan",
    kind: "wall",
    position: [14, 4, -22],
    size: [1, 8, 62],
    color: "#4d5563",
  },
  {
    id: "dinding-depan",
    kind: "wall",
    position: [0, 4, 9],
    size: [40, 8, 1],
    color: "#4d5563",
  },
];

/** Penanda jarak setiap sepuluh meter, sebagai garis rendah di lantai. */
const distanceMarkers: MapBlock[] = [-10, -20, -30, -40].map((z, index) => ({
  id: `garis-${index + 1}`,
  kind: "platform" as const,
  position: [0, 0.03, z] as Vec3,
  size: [26, 0.06, 0.3] as Vec3,
  color: "#6b7687",
}));

export const RANGE_MAP: ArenaMapInfo = {
  id: "map-tempat-latihan",
  name: "Tempat Latihan",
  description:
    "Lorong tembak dengan empat sasaran di jarak berbeda. Tidak ada lawan, tidak ada batas waktu.",
  previewUrl: null,
  floorSize: [28, 62],
  // Lantainya membentang dari z = 9 sampai z = -53, jadi pusatnya di z = -22.
  playableBounds: { minX: -13.5, maxX: 13.5, minZ: -51.5, maxZ: 8.5 },
  skyColor: "#0c1017",
  fogColor: "#222a35",
  fogRange: [45, 130],
  floorColor: "#4b5260",
  /**
   * Terang dan rata, tidak seperti peta bertanding.
   *
   * Lorong ini bukan tempat yang harus terasa di mana pun; satu-satunya
   * tugasnya adalah membuat keempat sasaran terbaca sama jelasnya di jarak
   * yang berbeda-beda. Kotak bayangannya memanjang jauh ke belakang mengikuti
   * bentuk lorongnya — kotak seimbang akan memotong bayangan sasaran terjauh.
   */
  lighting: {
    skyLight: "#aebfd6",
    groundLight: "#3a3f4a",
    hemisphereIntensity: 1.3,
    ambientIntensity: 0.55,
    key: {
      color: "#ffe9cc",
      intensity: 1.6,
      position: [6, 18, 10],
      shadowBox: { left: -20, right: 20, top: 20, bottom: -40, far: 90 },
    },
    fill: { color: "#8fb3e0", intensity: 0.55, position: [-8, 6, -20] },
  },
  blocks: [...walls, ...distanceMarkers, ...standBlocks, ...targetBlocks],
  spawnPoints: [RANGE_SPAWN],
};

/**
 * Indeks balok pada `RANGE_MAP.blocks` untuk tiap sasaran. Urutannya sama
 * dengan urutan collider yang dihasilkan `buildColliders`, jadi `blockIndex`
 * hasil raycast bisa langsung dipetakan ke sasaran.
 */
export const TARGET_INDEX_BY_BLOCK = new Map<number, string>(
  RANGE_MAP.blocks.flatMap((block, index) =>
    block.id.startsWith(TARGET_PREFIX)
      ? [[index, block.id] as [number, string]]
      : [],
  ),
);
