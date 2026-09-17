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
];

export const DEFAULT_MAP = MOCK_MAPS[0];
