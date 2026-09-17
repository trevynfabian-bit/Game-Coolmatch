import type {
  ArenaBounds,
  ArenaMapInfo,
  MapBlock,
  MapLighting,
} from "@/types/game";

const WALL_COLOR = "#6b6053";
const CRATE_COLOR = "#9c7440";
const PILLAR_COLOR = "#756a5b";
const PLATFORM_COLOR = "#7d7160";

/**
 * Tembok keliling yang mengurung area main sebuah peta.
 *
 * Panjangnya dihitung dari `half` — jarak dinding ke pusat — ditambah satu
 * supaya keempat sudutnya benar-benar tertutup alih-alih menyisakan celah
 * setebal dindingnya sendiri. Dijadikan fungsi karena tiap peta punya ukuran
 * sendiri, dan menuliskan ulang keempat dindingnya per peta adalah cara
 * tercepat membuat satu sisi kelewat atau salah tanda.
 */
function perimeterWalls(
  half: number,
  height: number,
  color: string = WALL_COLOR,
): MapBlock[] {
  const span = half * 2 + 1;
  const y = height / 2;
  return [
    {
      id: "wall-utara",
      kind: "wall",
      position: [0, y, -half],
      size: [span, height, 1],
      color,
    },
    {
      id: "wall-selatan",
      kind: "wall",
      position: [0, y, half],
      size: [span, height, 1],
      color,
    },
    {
      id: "wall-barat",
      kind: "wall",
      position: [-half, y, 0],
      size: [1, height, span],
      color,
    },
    {
      id: "wall-timur",
      kind: "wall",
      position: [half, y, 0],
      size: [1, height, span],
      color,
    },
  ];
}

/**
 * Batas keras area main sebuah peta: permukaan DALAM tembok kelilingnya.
 * Dihitung dari `half` yang sama supaya batas dan tembok tidak bisa berselisih
 * ketika ukuran peta diubah.
 */
function boundsInside(half: number): ArenaBounds {
  const edge = half - 0.5;
  return { minX: -edge, maxX: edge, minZ: -edge, maxZ: edge };
}

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

/* ------------------------------------------------------------------ *
 * Lorong Pabrik — peta sempit penuh lorong.
 *
 * Dua dinding panjang membelah arena jadi tiga jalur utara-selatan, masing-
 * masing dengan satu celah di tengah. Pandangan jarak jauh hampir selalu
 * terpotong, jadi pertempurannya jatuh ke jarak dekat dan sudut tikungan —
 * kebalikan dari Gudang Senja yang punya panggung tengah terbuka.
 * ------------------------------------------------------------------ */

const PABRIK_WALL = "#4a5560";
const PABRIK_MESIN = "#6b7684";

/** Dinding jalur: dua penggal per sisi, menyisakan celah di tengah. */
const pabrikLanes: MapBlock[] = [
  ["lorong-barat-utara", -6, -9],
  ["lorong-barat-selatan", -6, 9],
  ["lorong-timur-utara", 6, -9],
  ["lorong-timur-selatan", 6, 9],
].map(([id, x, z]) => ({
  id: id as string,
  kind: "wall" as const,
  position: [x as number, 1.6, z as number] as [number, number, number],
  size: [1, 3.2, 10] as [number, number, number],
  color: PABRIK_WALL,
}));

/** Blok mesin sebagai cover setinggi dada di jalur luar. */
const pabrikMachines: MapBlock[] = [
  ["mesin-bl", -12, -6, 2],
  ["mesin-br", 12, 6, 2],
  ["mesin-tl", -12, 8, 3],
  ["mesin-tr", 12, -8, 3],
  // Celah tengah kedua dinding jalur sejajar tepat di z=0, sehingga tanpa blok
  // ini ada garis tembak lurus dari tembok barat sampai tembok timur — persis
  // yang tidak boleh ada di peta yang seluruh rasanya bertumpu pada tikungan.
  ["mesin-tengah", 0, 0, 3],
].map(([id, x, z, h]) => ({
  id: id as string,
  kind: "crate" as const,
  position: [x as number, (h as number) / 2, z as number] as [
    number,
    number,
    number,
  ],
  size: [3, h as number, 3] as [number, number, number],
  color: PABRIK_MESIN,
}));

/** Cerobong tinggi di ujung jalur tengah; memutus tembakan lurus dari ujung ke ujung. */
const pabrikStacks: MapBlock[] = [
  ["cerobong-utara", -13],
  ["cerobong-selatan", 13],
].map(([id, z]) => ({
  id: id as string,
  kind: "pillar" as const,
  position: [0, 3, z as number] as [number, number, number],
  size: [1.5, 6, 1.5] as [number, number, number],
  color: PABRIK_MESIN,
}));

/* ------------------------------------------------------------------ *
 * Atap Kota — peta luas dan terbuka.
 *
 * Helipad di tengah, unit pendingin sebagai cover rendah, dan dua rumah
 * tangga di sisi barat-timur. Jarak pandangnya paling jauh di antara ketiga
 * peta, jadi senjata jarak jauh benar-benar terasa gunanya — dan berdiri di
 * tempat terbuka benar-benar berbahaya.
 * ------------------------------------------------------------------ */

const ATAP_PARAPET = "#57606f";
const ATAP_LANTAI = "#3e4650";
const ATAP_UNIT = "#8a8f98";

/** Helipad rendah di tengah: tinggi sedikit, terbuka dari segala arah. */
const atapHelipad: MapBlock[] = [
  {
    id: "helipad",
    kind: "platform",
    position: [0, 0.6, 0],
    size: [14, 1.2, 14],
    color: ATAP_LANTAI,
  },
];

/** Unit pendingin: cover rendah yang tersebar mengelilingi helipad. */
const atapUnits: MapBlock[] = [
  ["unit-bl", -10, -10],
  ["unit-br", 10, -10],
  ["unit-tl", -10, 10],
  ["unit-tr", 10, 10],
  ["unit-utara", 0, -14],
  ["unit-selatan", 0, 14],
].map(([id, x, z]) => ({
  id: id as string,
  kind: "crate" as const,
  position: [x as number, 1.2, z as number] as [number, number, number],
  size: [3, 2.4, 3] as [number, number, number],
  color: ATAP_UNIT,
}));

/** Rumah tangga: satu-satunya penghalang tinggi, menutup sisi barat dan timur. */
const atapStairwells: MapBlock[] = [
  ["tangga-barat", -18],
  ["tangga-timur", 18],
].map(([id, x]) => ({
  id: id as string,
  kind: "wall" as const,
  position: [x as number, 2.5, 0] as [number, number, number],
  size: [4, 5, 8] as [number, number, number],
  color: ATAP_PARAPET,
}));

/** Parapet setinggi dada di sudut, satu-satunya cover di area terbuka luar. */
const atapParapets: MapBlock[] = [
  ["parapet-bl", -18, -18, 8, 1],
  ["parapet-br", 18, -18, 8, 1],
  ["parapet-tl", -18, 18, 8, 1],
  ["parapet-tr", 18, 18, 8, 1],
].map(([id, x, z, w, d]) => ({
  id: id as string,
  kind: "wall" as const,
  position: [x as number, 0.9, z as number] as [number, number, number],
  size: [w as number, 1.8, d as number] as [number, number, number],
  color: ATAP_PARAPET,
}));

/**
 * Matahari senja rendah yang masuk lewat jendela atas gudang.
 *
 * Hangat dan miring, jadi tumpukan krat melempar bayangan panjang melintasi
 * lantai — itulah yang membuat ruangan terbaca sebagai sore hari, bukan sekadar
 * ruangan gelap.
 */
const GUDANG_LIGHTING: MapLighting = {
  skyLight: "#9db4d2",
  groundLight: "#3a332b",
  hemisphereIntensity: 1.15,
  ambientIntensity: 0.45,
  key: {
    color: "#ffd9ad",
    intensity: 1.9,
    position: [18, 26, 10],
    shadowBox: { left: -30, right: 30, top: 30, bottom: -30, far: 70 },
  },
  fill: { color: "#7aa2d6", intensity: 0.5, position: [-14, 10, -12] },
};

/**
 * Lampu langit-langit pabrik: dingin, hampir tegak lurus, tidak ada matahari.
 *
 * Sengaja jauh lebih lemah daripada peta lain, dengan cahaya rata yang justru
 * dinaikkan. Begitulah ruang tertutup bekerja — tidak ada sumber kuat dari satu
 * arah, tetapi tembok yang rapat memantulkan apa pun yang ada, sehingga sudut
 * gelap tidak pernah benar-benar hitam. Bayangan yang nyaris lurus ke bawah
 * membuat jalur-jalur sempitnya terbaca sebagai lorong, bukan sebagai
 * penghalang di lapangan terbuka.
 */
const PABRIK_LIGHTING: MapLighting = {
  skyLight: "#8f9bab",
  groundLight: "#2b2d33",
  hemisphereIntensity: 0.9,
  ambientIntensity: 0.62,
  key: {
    color: "#cfe0ef",
    intensity: 1.15,
    position: [5, 30, 3],
    shadowBox: { left: -24, right: 24, top: 24, bottom: -24, far: 62 },
  },
  fill: { color: "#5f7f94", intensity: 0.35, position: [-10, 8, 14] },
};

/**
 * Malam di atap: bulan dari satu sisi, lampu kota dari sisi lain.
 *
 * Isiannya hangat dan ditaruh RENDAH, setinggi dada — cahaya kota datang dari
 * bawah, dari jalanan, bukan dari langit. Itu satu-satunya hal yang membuat
 * atap terasa berada di atas sesuatu. Cahaya ratanya paling redup di antara
 * ketiga peta karena memang malam hari; yang menerangi hanyalah dua sumber itu.
 */
const ATAP_LIGHTING: MapLighting = {
  skyLight: "#6f6a9c",
  groundLight: "#2a2333",
  hemisphereIntensity: 1,
  ambientIntensity: 0.34,
  key: {
    color: "#cdd6ff",
    intensity: 1.5,
    position: [-20, 30, -16],
    shadowBox: { left: -34, right: 34, top: 34, bottom: -34, far: 80 },
  },
  fill: { color: "#ff9d5c", intensity: 0.55, position: [14, 4, 18] },
};

export const MOCK_MAPS: ArenaMapInfo[] = [
  {
    id: "map-gudang-senja",
    name: "Gudang Senja",
    description:
      "Gudang tua bertingkat dengan panggung tengah dan tumpukan krat. Cocok untuk duel jarak dekat sampai menengah.",
    previewUrl: null,
    floorSize: [45, 45],
    playableBounds: boundsInside(22),
    skyColor: "#0e1219",
    fogColor: "#2a3039",
    fogRange: [30, 95],
    floorColor: "#554d42",
    lighting: GUDANG_LIGHTING,
    blocks: [
      ...perimeterWalls(22, 7),
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
    id: "map-lorong-pabrik",
    name: "Lorong Pabrik",
    description:
      "Pabrik sempit yang dibelah dua dinding panjang jadi tiga jalur. Nyaris tidak ada tembakan jarak jauh — yang menang biasanya yang lebih dulu menyadari ada orang di tikungan.",
    previewUrl: null,
    floorSize: [37, 37],
    playableBounds: boundsInside(18),
    skyColor: "#0b0f14",
    fogColor: "#1f262e",
    fogRange: [16, 58],
    floorColor: "#3f4148",
    lighting: PABRIK_LIGHTING,
    blocks: [
      ...perimeterWalls(18, 7, PABRIK_WALL),
      ...pabrikLanes,
      ...pabrikMachines,
      ...pabrikStacks,
    ],
    // Tujuh titik: peta ini lebih sempit, jadi menampung lebih sedikit lawan
    // daripada Gudang Senja. Semuanya di jalur luar dan ujung arena, berjauhan.
    spawnPoints: [
      [-15, 0, 15],
      [15, 0, -15],
      [15, 0, 15],
      [-15, 0, -15],
      [0, 0, 16],
      [0, 0, -16],
      [-16, 0, 0],
    ],
  },
  {
    id: "map-atap-kota",
    name: "Atap Kota",
    description:
      "Atap gedung yang luas dan nyaris tanpa atap pelindung. Jarak pandangnya paling jauh di antara semua peta, jadi senapan runduk benar-benar terasa gunanya — dan berdiri di tempat terbuka benar-benar berbahaya.",
    previewUrl: null,
    floorSize: [53, 53],
    playableBounds: boundsInside(26),
    skyColor: "#1a1622",
    fogColor: "#3b3348",
    fogRange: [46, 150],
    floorColor: "#4a4d55",
    lighting: ATAP_LIGHTING,
    blocks: [
      ...perimeterWalls(26, 4, ATAP_PARAPET),
      ...atapHelipad,
      ...atapUnits,
      ...atapStairwells,
      ...atapParapets,
    ],
    // Sembilan titik di peta terluas: satu pemain plus delapan lawan, semuanya
    // di tepi arena dan berjauhan dari helipad tengah yang jadi rebutan.
    spawnPoints: [
      [-22, 0, 22],
      [22, 0, -22],
      [22, 0, 22],
      [-22, 0, -22],
      [0, 0, 23],
      [0, 0, -23],
      [-23, 0, 0],
      [23, 0, 0],
      [-12, 0, 0],
    ],
  },
];

/** Peta yang dipakai bila pemain belum pernah memilih sendiri. */
export const DEFAULT_MAP = MOCK_MAPS[0];

/** Peta dengan id tertentu, atau peta bawaan bila idnya tidak dikenal. */
export function findMap(mapId: string): ArenaMapInfo {
  return MOCK_MAPS.find((map) => map.id === mapId) ?? DEFAULT_MAP;
}
