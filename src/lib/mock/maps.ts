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

/* --------------------------------------------------------------------------
 * Silo Kembar — dua panggung tinggi yang saling berhadapan menyilang arena.
 * ----------------------------------------------------------------------- */

const SILO_WALL = "#5c6152";
const SILO_PANGGUNG = "#717c64";
const SILO_KRAT = "#8f7a48";

/**
 * Satu panggung silo beserta dua tangganya.
 *
 * Tangganya selalu di dua sisi yang MENGHADAP PUSAT arena, dan itu yang
 * menentukan cara peta ini dimainkan. Satu tangga saja membuat panggung nyaris
 * mustahil direbut — penyerang hanya punya satu mulut untuk dijaga, dan yang
 * di atas tinggal menunggu. Dua tangga memaksa pemegang panggung memilih sisi
 * mana yang ia tinggalkan.
 */
function siloPanggung(nama: string, cx: number, cz: number): MapBlock[] {
  // Arah ke pusat: panggung di kuadran negatif menatap ke positif, dan
  // sebaliknya. Tandanya diturunkan dari posisinya sendiri supaya menambah
  // silo ketiga nanti tidak menuntut tabel arah yang ditulis tangan.
  const ax = cx < 0 ? 1 : -1;
  const az = cz < 0 ? 1 : -1;

  return [
    {
      id: `${nama}-panggung`,
      kind: "platform",
      position: [cx, 1, cz],
      size: [11, 2, 11],
      color: SILO_PANGGUNG,
    },
    {
      id: `${nama}-tangga-x-atas`,
      kind: "ramp",
      position: [cx + ax * 7, 0.75, cz],
      size: [3, 1.5, 7],
      color: SILO_PANGGUNG,
    },
    {
      id: `${nama}-tangga-x-bawah`,
      kind: "ramp",
      position: [cx + ax * 10, 0.375, cz],
      size: [3, 0.75, 7],
      color: SILO_PANGGUNG,
    },
    {
      id: `${nama}-tangga-z-atas`,
      kind: "ramp",
      position: [cx, 0.75, cz + az * 7],
      size: [7, 1.5, 3],
      color: SILO_PANGGUNG,
    },
    {
      id: `${nama}-tangga-z-bawah`,
      kind: "ramp",
      position: [cx, 0.375, cz + az * 10],
      size: [7, 0.75, 3],
      color: SILO_PANGGUNG,
    },
  ];
}

/**
 * Penghalang di tengah arena.
 *
 * Kedua silo berdiri di diagonal barat-laut dan tenggara, dan tanpa apa pun di
 * antaranya garis tembak diagonal itu menjadi satu-satunya permainan: siapa
 * yang lebih dulu mengintip menang, berulang-ulang. Deretan ini memotongnya
 * tepat di tengah, jadi menyeberang tetap mungkin tetapi tidak pernah dalam
 * satu garis lurus yang terus terlihat.
 */
const siloTengah: MapBlock[] = [
  {
    id: "silo-cover-tengah-a",
    kind: "wall",
    position: [-3, 1.6, 3],
    size: [9, 3.2, 1],
    rotationY: Math.PI / 4,
    color: SILO_WALL,
  },
  {
    id: "silo-cover-tengah-b",
    kind: "wall",
    position: [3, 1.6, -3],
    size: [9, 3.2, 1],
    rotationY: Math.PI / 4,
    color: SILO_WALL,
  },
  {
    id: "silo-pilar-timur",
    kind: "pillar",
    position: [12, 2.5, -12],
    size: [1.6, 5, 1.6],
    color: PILLAR_COLOR,
  },
  {
    id: "silo-pilar-barat",
    kind: "pillar",
    position: [-12, 2.5, 12],
    size: [1.6, 5, 1.6],
    color: PILLAR_COLOR,
  },
  {
    id: "silo-krat-timur",
    kind: "crate",
    position: [15, 0.9, -6],
    size: [1.8, 1.8, 1.8],
    rotationY: Math.PI / 8,
    color: SILO_KRAT,
  },
  {
    id: "silo-krat-barat",
    kind: "crate",
    position: [-15, 0.9, 6],
    size: [1.8, 1.8, 1.8],
    rotationY: -Math.PI / 7,
    color: SILO_KRAT,
  },
  {
    id: "silo-krat-utara",
    kind: "crate",
    position: [6, 1.1, -16],
    size: [2.2, 2.2, 2.2],
    color: SILO_KRAT,
  },
  {
    id: "silo-drum-a",
    kind: "drum",
    position: [-2, 0.6, -14],
    size: [0.9, 1.2, 0.9],
    color: "#8a7f5e",
  },
  {
    id: "silo-drum-b",
    kind: "drum",
    position: [-0.4, 0.6, -15.2],
    size: [0.9, 1.2, 0.9],
    color: "#7a7256",
  },
  {
    id: "silo-drum-c",
    kind: "drum",
    position: [2, 0.6, 14],
    size: [0.9, 1.2, 0.9],
    color: "#8a7f5e",
  },
  {
    id: "silo-drum-d",
    kind: "drum",
    position: [0.4, 0.6, 15.2],
    size: [0.9, 1.2, 0.9],
    color: "#7a7256",
  },
  {
    id: "silo-krat-selatan",
    kind: "crate",
    position: [-6, 1.1, 16],
    size: [2.2, 2.2, 2.2],
    rotationY: Math.PI / 5,
    color: SILO_KRAT,
  },
];

/**
 * Sore berkabut di antara dua silo: matahari rendah dari barat, bayangan
 * panjang. Bayangan panjang itu yang penting di sini — ia menandai kedua
 * panggung dari jauh, sehingga pemain tahu ke arah mana ia sedang menyeberang.
 */
const SILO_LIGHTING: MapLighting = {
  skyLight: "#b6bcc4",
  groundLight: "#43423a",
  hemisphereIntensity: 1.05,
  ambientIntensity: 0.48,
  key: {
    color: "#ffcf9e",
    intensity: 1.7,
    position: [-24, 18, 8],
    shadowBox: { left: -28, right: 28, top: 28, bottom: -28, far: 68 },
  },
  fill: { color: "#8fb0cf", intensity: 0.45, position: [16, 12, -14] },
};

/* --------------------------------------------------------------------------
 * Halaman Tengah — satu bangunan padat yang harus dikelilingi.
 * ----------------------------------------------------------------------- */

const HALAMAN_WALL = "#6a6459";
const HALAMAN_BLOK = "#7b7468";

/**
 * Bangunan tengah yang TIDAK bisa ditembus maupun dinaiki.
 *
 * Tingginya sengaja sama dengan tembok keliling. Bangunan yang lebih pendek
 * akan mengundang pemain mencoba memanjatnya, dan begitu ada yang berhasil,
 * ia berdiri di atap tanpa penutup sambil mengawasi seluruh cincin — persis
 * kebalikan dari yang diinginkan peta ini. Karena tidak bisa dilewati sama
 * sekali, tidak ada satu pun garis tembak yang melintasi pusat, dan seluruh
 * pertarungan berpindah ke tikungan.
 */
const halamanBangunan: MapBlock[] = [
  {
    id: "halaman-inti",
    kind: "wall",
    position: [0, 3.5, 0],
    size: [15, 7, 15],
    color: HALAMAN_BLOK,
  },
];

/**
 * Penutup di cincin sekeliling bangunan.
 *
 * Tiap sisi mendapat satu tembok setengah badan yang digeser dari tengah, tidak
 * ditaruh simetris. Penutup yang persis di tengah tiap sisi membuat keempat
 * tikungan terasa identik, dan pemain kehilangan satu-satunya cara mengetahui
 * ia sedang berada di sisi yang mana.
 */
const halamanCincin: MapBlock[] = [
  {
    id: "halaman-cover-utara",
    kind: "wall",
    position: [-5, 1.1, -12],
    size: [8, 2.2, 1],
    color: HALAMAN_WALL,
  },
  {
    id: "halaman-cover-selatan",
    kind: "wall",
    position: [5, 1.1, 12],
    size: [8, 2.2, 1],
    color: HALAMAN_WALL,
  },
  {
    id: "halaman-cover-barat",
    kind: "wall",
    position: [-12, 1.1, 5],
    size: [1, 2.2, 8],
    color: HALAMAN_WALL,
  },
  {
    id: "halaman-cover-timur",
    kind: "wall",
    position: [12, 1.1, -5],
    size: [1, 2.2, 8],
    color: HALAMAN_WALL,
  },
  {
    id: "halaman-krat-bl",
    kind: "crate",
    position: [-15.5, 1, -15.5],
    size: [2.4, 2, 2.4],
    rotationY: Math.PI / 9,
    color: CRATE_COLOR,
  },
  {
    id: "halaman-krat-br",
    kind: "crate",
    position: [15.5, 1, -15.5],
    size: [2.4, 2, 2.4],
    color: CRATE_COLOR,
  },
  {
    id: "halaman-krat-tl",
    kind: "crate",
    position: [-15.5, 1, 15.5],
    size: [2.4, 2, 2.4],
    rotationY: -Math.PI / 6,
    color: CRATE_COLOR,
  },
  {
    id: "halaman-krat-tr",
    kind: "crate",
    position: [15.5, 1, 15.5],
    size: [2.4, 2, 2.4],
    color: CRATE_COLOR,
  },
  {
    id: "halaman-drum-utara",
    kind: "drum",
    position: [4, 0.6, -12],
    size: [0.9, 1.2, 0.9],
    color: "#7f7a63",
  },
  {
    id: "halaman-drum-selatan",
    kind: "drum",
    position: [-4, 0.6, 12],
    size: [0.9, 1.2, 0.9],
    color: "#7f7a63",
  },
  {
    id: "halaman-drum-barat",
    kind: "drum",
    position: [-12, 0.6, -4],
    size: [0.9, 1.2, 0.9],
    color: "#767059",
  },
  {
    id: "halaman-drum-timur",
    kind: "drum",
    position: [12, 0.6, 4],
    size: [0.9, 1.2, 0.9],
    color: "#767059",
  },
  {
    id: "halaman-pilar-bl",
    kind: "pillar",
    position: [-11, 2, -11],
    size: [1.4, 4, 1.4],
    color: PILLAR_COLOR,
  },
  {
    id: "halaman-pilar-tr",
    kind: "pillar",
    position: [11, 2, 11],
    size: [1.4, 4, 1.4],
    color: PILLAR_COLOR,
  },
];

/**
 * Siang mendung di halaman terbuka: terang merata, bayangan lembut.
 *
 * Kontrasnya paling rendah di antara semua peta, dan itu disengaja. Peta ini
 * dimenangkan dengan mendengar dan menebak, bukan dengan melihat lebih dulu;
 * bayangan tajam yang menjulur keluar dari tikungan akan membocorkan posisi
 * seseorang sebelum ia sendiri sempat mengintip.
 */
const HALAMAN_LIGHTING: MapLighting = {
  skyLight: "#c9d2dc",
  groundLight: "#4c4a44",
  hemisphereIntensity: 1.25,
  ambientIntensity: 0.66,
  key: {
    color: "#eef1f5",
    intensity: 1.05,
    position: [10, 34, 12],
    shadowBox: { left: -30, right: 30, top: 30, bottom: -30, far: 74 },
  },
  fill: { color: "#a9b6c4", intensity: 0.42, position: [-16, 10, -10] },
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
      // Dulu [-15, -16], hanya 3,6 satuan dari titik di sudut barat-laut —
      // cukup dekat untuk membuat dua orang saling melihat sebelum sempat
      // melangkah, dan itu bukan awal yang adil bagi keduanya.
      [-9, 0, -16],
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
  {
    id: "map-silo-kembar",
    name: "Silo Kembar",
    description:
      "Dua panggung tinggi berhadapan menyilang arena, masing-masing bisa dinaiki dari dua tangga. Yang memegang panggung menguasai pandangan, tetapi tidak bisa menjaga kedua tangganya sekaligus.",
    previewUrl: null,
    floorSize: [41, 41],
    playableBounds: boundsInside(20),
    skyColor: "#141821",
    fogColor: "#333a42",
    fogRange: [26, 88],
    floorColor: "#514f45",
    lighting: SILO_LIGHTING,
    blocks: [
      ...perimeterWalls(20, 7, SILO_WALL),
      ...siloPanggung("silo-barat", -11, -11),
      ...siloPanggung("silo-timur", 11, 11),
      ...siloTengah,
    ],
    // Delapan titik, semuanya di cincin luar dan jauh dari kedua panggung:
    // muncul tepat di kaki tangga lawan bukan awal yang adil bagi siapa pun.
    spawnPoints: [
      [-17, 0, 17],
      [17, 0, -17],
      [0, 0, 17.5],
      [0, 0, -17.5],
      [17.5, 0, 0],
      [-17.5, 0, 0],
      [17, 0, 17],
      [-17, 0, -17],
    ],
  },
  {
    id: "map-halaman-tengah",
    name: "Halaman Tengah",
    description:
      "Satu bangunan padat berdiri di tengah dan tidak bisa dilewati, jadi seluruh arena adalah cincin mengelilinginya. Tidak ada tembakan yang melintasi pusat — yang menentukan adalah siapa lebih dulu sampai di tikungan.",
    previewUrl: null,
    floorSize: [43, 43],
    playableBounds: boundsInside(21),
    skyColor: "#1b1f26",
    fogColor: "#454a52",
    fogRange: [30, 96],
    floorColor: "#585349",
    lighting: HALAMAN_LIGHTING,
    blocks: [
      ...perimeterWalls(21, 7, HALAMAN_WALL),
      ...halamanBangunan,
      ...halamanCincin,
    ],
    // Delapan titik yang tersebar rata di sekeliling cincin. Pemerataan itu
    // penting di peta melingkar: dua titik yang berdekatan pada cincin berarti
    // dua orang yang bertemu sebelum sempat bergerak.
    spawnPoints: [
      [-18, 0, -18],
      [18, 0, -18],
      [18, 0, 18],
      [-18, 0, 18],
      [0, 0, -18.5],
      [18.5, 0, 0],
      [0, 0, 18.5],
      [-18.5, 0, 0],
    ],
  },
];

/** Peta yang dipakai bila pemain belum pernah memilih sendiri. */
export const DEFAULT_MAP = MOCK_MAPS[0];

/** Peta dengan id tertentu, atau peta bawaan bila idnya tidak dikenal. */
export function findMap(mapId: string): ArenaMapInfo {
  return MOCK_MAPS.find((map) => map.id === mapId) ?? DEFAULT_MAP;
}
