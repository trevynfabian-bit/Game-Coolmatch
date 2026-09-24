import type { ArenaMapInfo, MapBlock } from "@/types/game";

const WALL_COLOR = "#6b6053";
const CRATE_COLOR = "#9c7440";
const PILLAR_COLOR = "#756a5b";
const PLATFORM_COLOR = "#7d7160";

/** Tembok keliling arena setinggi 7 unit yang mengurung area main. */
const perimeter: MapBlock[] = [
  {
    id: "wall-utara",
    kind: "wall",
    position: [0, 3.5, -22],
    size: [45, 7, 1],
    color: WALL_COLOR,
  },
  {
    id: "wall-selatan",
    kind: "wall",
    position: [0, 3.5, 22],
    size: [45, 7, 1],
    color: WALL_COLOR,
  },
  {
    id: "wall-barat",
    kind: "wall",
    position: [-22, 3.5, 0],
    size: [1, 7, 45],
    color: WALL_COLOR,
  },
  {
    id: "wall-timur",
    kind: "wall",
    position: [22, 3.5, 0],
    size: [1, 7, 45],
    color: WALL_COLOR,
  },
];

/**
 * Panggung tengah plus tangga bertingkat di sisi utara & selatan. Ini titik
 * rebutan utama arena: tinggi, terbuka, dan bisa dinaiki dari dua arah.
 */
const centerStructure: MapBlock[] = [
  {
    id: "panggung-tengah",
    kind: "platform",
    position: [0, 1, 0],
    size: [12, 2, 12],
    color: PLATFORM_COLOR,
  },
  {
    id: "tangga-utara-atas",
    kind: "ramp",
    position: [0, 0.75, -7.5],
    size: [10, 1.5, 3],
    color: PLATFORM_COLOR,
  },
  {
    id: "tangga-utara-bawah",
    kind: "ramp",
    position: [0, 0.375, -10.5],
    size: [10, 0.75, 3],
    color: PLATFORM_COLOR,
  },
  {
    id: "tangga-selatan-atas",
    kind: "ramp",
    position: [0, 0.75, 7.5],
    size: [10, 1.5, 3],
    color: PLATFORM_COLOR,
  },
  {
    id: "tangga-selatan-bawah",
    kind: "ramp",
    position: [0, 0.375, 10.5],
    size: [10, 0.75, 3],
    color: PLATFORM_COLOR,
  },
];

/** Pilar sudut sebagai penghalang pandangan jarak jauh. */
const pillars: MapBlock[] = [
  { id: "pilar-bl", position: [-9, 3, -9] },
  { id: "pilar-br", position: [9, 3, -9] },
  { id: "pilar-tl", position: [-9, 3, 9] },
  { id: "pilar-tr", position: [9, 3, 9] },
].map(({ id, position }) => ({
  id,
  kind: "pillar" as const,
  position: position as [number, number, number],
  size: [1.5, 6, 1.5] as [number, number, number],
  color: PILLAR_COLOR,
}));

/** Krat kayu untuk cover rendah, sebagian ditumpuk dua tingkat. */
const crates: MapBlock[] = [
  {
    id: "krat-bl",
    kind: "crate",
    position: [-13, 0.75, -13],
    size: [3, 1.5, 3],
    color: CRATE_COLOR,
  },
  {
    id: "krat-bl-tumpuk",
    kind: "crate",
    position: [-13, 2, -13],
    size: [2, 1, 2],
    rotationY: Math.PI / 6,
    color: CRATE_COLOR,
  },
  {
    id: "krat-br",
    kind: "crate",
    position: [13, 0.75, -13],
    size: [3, 1.5, 3],
    rotationY: Math.PI / 10,
    color: CRATE_COLOR,
  },
  {
    id: "krat-tl",
    kind: "crate",
    position: [-13, 0.75, 13],
    size: [3, 1.5, 3],
    rotationY: -Math.PI / 12,
    color: CRATE_COLOR,
  },
  {
    id: "krat-tr",
    kind: "crate",
    position: [13, 0.75, 13],
    size: [3, 1.5, 3],
    color: CRATE_COLOR,
  },
  {
    id: "krat-tr-tumpuk",
    kind: "crate",
    position: [13, 2, 13],
    size: [2, 1, 2],
    rotationY: -Math.PI / 5,
    color: CRATE_COLOR,
  },
  {
    id: "kotak-barat",
    kind: "crate",
    position: [-16.5, 1.5, 0],
    size: [3, 3, 3],
    color: CRATE_COLOR,
  },
  {
    id: "kotak-timur",
    kind: "crate",
    position: [16.5, 1.5, 0],
    size: [3, 3, 3],
    color: CRATE_COLOR,
  },
];

/** Tembok setengah badan untuk bertahan sambil menembak. */
const halfWalls: MapBlock[] = [
  {
    id: "cover-barat",
    kind: "wall",
    position: [-17, 1, -8],
    size: [7, 2, 1],
    color: WALL_COLOR,
  },
  {
    id: "cover-timur",
    kind: "wall",
    position: [17, 1, 8],
    size: [7, 2, 1],
    color: WALL_COLOR,
  },
  {
    id: "cover-utara",
    kind: "wall",
    position: [7, 1, -17],
    size: [1, 2, 7],
    color: WALL_COLOR,
  },
  {
    id: "cover-selatan",
    kind: "wall",
    position: [-7, 1, 17],
    size: [1, 2, 7],
    color: WALL_COLOR,
  },
];


const HARBOR_WALL = "#4b5563";
const CONTAINER_COLORS = ["#b45309", "#1d4ed8", "#15803d", "#b91c1c", "#6d28d9"];

/** Kontainer pelabuhan: balok panjang, sebagian ditumpuk dua. */
function container(id: string, x: number, z: number, rotated: boolean, level: 0 | 1, colorIndex: number): MapBlock {
  return {
    id,
    kind: "crate",
    position: [x, 1.3 + level * 2.6, z],
    size: rotated ? [2.5, 2.6, 6] : [6, 2.6, 2.5],
    color: CONTAINER_COLORS[colorIndex % CONTAINER_COLORS.length],
  };
}

/**
 * Pelabuhan Kabut: lapangan terbuka yang dipotong deretan kontainer menjadi
 * lorong-lorong. Garis pandang panjang di lorong tengah, pertarungan jarak
 * dekat di sela tumpukan.
 */
const harborBlocks: MapBlock[] = [
  { id: "pk-wall-utara", kind: "wall", position: [0, 3.5, -26], size: [53, 7, 1], color: HARBOR_WALL },
  { id: "pk-wall-selatan", kind: "wall", position: [0, 3.5, 26], size: [53, 7, 1], color: HARBOR_WALL },
  { id: "pk-wall-barat", kind: "wall", position: [-26, 3.5, 0], size: [1, 7, 53], color: HARBOR_WALL },
  { id: "pk-wall-timur", kind: "wall", position: [26, 3.5, 0], size: [1, 7, 53], color: HARBOR_WALL },
  container("pk-k1", -14, -14, false, 0, 0),
  container("pk-k1b", -14, -14, false, 1, 1),
  container("pk-k2", -6, -18, true, 0, 2),
  container("pk-k3", 8, -15, false, 0, 3),
  container("pk-k4", 16, -8, true, 0, 4),
  container("pk-k4b", 16, -8, true, 1, 0),
  container("pk-k5", -17, 2, true, 0, 1),
  container("pk-k6", -7, 5, false, 0, 2),
  container("pk-k7", 6, 3, false, 0, 3),
  container("pk-k7b", 6, 3, false, 1, 4),
  container("pk-k8", 17, 10, true, 0, 0),
  container("pk-k9", -12, 16, false, 0, 1),
  container("pk-k10", 4, 17, true, 0, 2),
  container("pk-k11", 12, 19, false, 0, 3),
  { id: "pk-derek", kind: "pillar", position: [0, 4, -6], size: [1.6, 8, 1.6], color: "#facc15" },
  { id: "pk-palet-1", kind: "platform", position: [-2, 0.4, 11], size: [4, 0.8, 3], color: "#78716c" },
  { id: "pk-palet-2", kind: "platform", position: [11, 0.4, -2], size: [3, 0.8, 4], color: "#78716c" },
];

export const MOCK_MAPS: ArenaMapInfo[] = [
  {
    id: "map-gudang-senja",
    name: "Gudang Senja",
    description:
      "Gudang tua bertingkat dengan panggung tengah dan tumpukan krat. Cocok untuk duel jarak dekat sampai menengah.",
    previewUrl: null,
    floorSize: [45, 45],
    // Tembok keliling berpusat di +-22 dengan tebal 1, jadi permukaan dalamnya
    // ada di +-21.5. Itulah batas keras area main.
    playableBounds: { minX: -21.5, maxX: 21.5, minZ: -21.5, maxZ: 21.5 },
    skyColor: "#0e1219",
    fogColor: "#2a3039",
    floorColor: "#554d42",
    blocks: [
      ...perimeter,
      ...centerStructure,
      ...pillars,
      ...crates,
      ...halfWalls,
    ],
    // Sembilan titik: satu pemain plus maksimal delapan lawan, semuanya di
    // ruang terbuka dan berjauhan satu sama lain.
    spawnPoints: [
      [-18.5, 0, 18.5],
      [-15, 0, -16],
      [15, 0, -16],
      [18, 0, 7],
      [-18, 0, -4],
      [18, 0, 18],
      [-18, 0, -18],
      [0, 0, 19],
      [0, 0, -19],
    ],
  },
  {
    id: "map-pelabuhan-kabut",
    name: "Pelabuhan Kabut",
    description:
      "Dermaga berkabut dengan deretan kontainer. Lorong panjang untuk penembak jitu, sela tumpukan untuk baku tembak dekat.",
    previewUrl: null,
    floorSize: [53, 53],
    playableBounds: { minX: -25.5, maxX: 25.5, minZ: -25.5, maxZ: 25.5 },
    skyColor: "#1b2330",
    fogColor: "#4b5563",
    floorColor: "#3f4448",
    blocks: harborBlocks,
    spawnPoints: [
      [-22, 0, 22],
      [22, 0, -22],
      [-22, 0, -22],
      [22, 0, 22],
      [0, 0, -22],
      [0, 0, 22],
      [-22, 0, 8],
      [22, 0, -2],
      [-2, 0, -2],
    ],
  },
];

export const DEFAULT_MAP = MOCK_MAPS[0];

/** Peta menurut id; jatuh ke peta bawaan bila id tidak dikenal. */
export function findMap(mapId: string | null | undefined): ArenaMapInfo {
  return MOCK_MAPS.find((map) => map.id === mapId) ?? DEFAULT_MAP;
}
