import {
  CanvasTexture,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import { seededRandom } from "@/lib/textures/noise";
import {
  ROUGHNESS_PROFILE,
  SURFACE_KINDS,
  paintSurface,
  type SurfaceKind,
} from "@/lib/textures/surface-painters";

/**
 * Mesin tekstur arena.
 *
 * Kembarannya adalah mesin suara: seluruh teksturnya DIBANGKITKAN di dalam
 * kanvas, bukan dimuat dari berkas. Tidak ada satu pun berkas gambar di
 * repositori ini, dan menambahkannya berarti pemain harus mengunduh beberapa
 * megabita sebelum arena bisa dibuka — padahal yang dibutuhkan hanyalah beton,
 * kayu, dan pelat logam, yang semuanya bisa disusun dari derau dan beberapa
 * ratus garis.
 *
 * Tiga hal yang membuat pembangkitan ini aman dipakai di dalam permainan:
 *
 * Pertama, hasilnya DISIMPAN. Melukis kanvas 256 piksel butuh puluhan
 * milidetik; melakukannya sekali saat peta dibuka tidak terasa, melakukannya
 * per balok per frame akan menghentikan permainan. Karena itu tiap jenis
 * permukaan hanya pernah dilukis satu kali sepanjang umur halaman.
 *
 * Kedua, hasilnya BISA DIULANG. Benihnya tetap, jadi tembok yang sama selalu
 * bernoda di tempat yang sama — pemain yang hafal sebuah sudut tidak akan
 * menemukannya berubah, dan hasilnya bisa diperiksa.
 *
 * Ketiga, ia MENYERAH DENGAN AMAN. Di server tidak ada `document`, dan
 * pemanggilnya mendapat null alih-alih galat. Arena tanpa tekstur masih arena;
 * arena yang gagal dirender bukan apa-apa.
 */

/**
 * Sisi tekstur dalam piksel.
 *
 * 256, bukan 1024. Teksturnya dipasang berulang, jadi ketajaman datang dari
 * seberapa rapat ia diulang, bukan dari seberapa besar satu petaknya. Angka
 * ini juga yang menjaga seluruh set tekstur tetap di bawah beberapa megabita
 * di memori kartu grafis, sesuai janji "ringan di peramban".
 */
const TEXTURE_SIZE = 256;

/**
 * Berapa satuan dunia yang ditempati satu petak tekstur.
 *
 * Inilah yang menjaga kerapatan teksel tetap sama di seluruh arena. Tanpa ini,
 * tembok sepanjang 20 satuan dan peti selebar 1 satuan sama-sama mendapat satu
 * petak tekstur: petinya terlihat berbutir halus sementara temboknya seperti
 * diregangkan sampai kabur.
 *
 * Angkanya dipilih dari benda yang diwakilinya. Satu panel beton kira-kira
 * empat meter, satu peti kira-kira satu meter, jadi begitu pula petaknya.
 */
const WORLD_UNITS_PER_TILE: Record<SurfaceKind, number> = {
  wall: 4,
  floor: 4,
  crate: 1.2,
  crateTop: 1.2,
  pillar: 3,
  metal: 2.5,
};

/**
 * Jenis yang satu teksturnya mewakili SATU BENDA UTUH, bukan bahan yang
 * dipotong sepanjang berapa pun.
 *
 * Beton adalah bahan: dua puluh satuan tembok berarti lima petak beton, dan
 * itu benar. Peti bukan — gambarnya sudah memuat sabuk atas dan sabuk bawah
 * sebuah peti, jadi mengulangnya tiga kali pada peti setinggi tiga satuan
 * menghasilkan tiga peti kecil bertumpuk di dalam satu peti besar. Berapa pun
 * ukurannya, satu peti tetap satu peti.
 */
const SATU_BENDA: ReadonlySet<SurfaceKind> = new Set<SurfaceKind>([
  "crate",
  "crateTop",
]);

/** Benih tiap jenis, supaya beton dan kayu tidak berbagi pola yang sama persis. */
const SEED: Record<SurfaceKind, number> = {
  wall: 0x5ea11,
  floor: 0x10074,
  crate: 0xc4a7e,
  crateTop: 0x707c4a,
  pillar: 0x9111a,
  metal: 0x37a11,
};

export interface SurfaceTextures {
  /** Peta warna, abu-abu, siap dikalikan dengan warna balok. */
  map: Texture;
  /** Peta kekasaran, diturunkan dari peta warna di atas. */
  roughnessMap: Texture;
}

const simpanan = new Map<SurfaceKind, SurfaceTextures>();
const salinan = new Map<string, SurfaceTextures>();
let anisotropy = 1;

function buatKanvas(size: number): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  const kanvas = document.createElement("canvas");
  kanvas.width = size;
  kanvas.height = size;
  return kanvas.getContext("2d");
}

/**
 * Menurunkan peta kekasaran dari peta warna yang baru saja dilukis.
 *
 * Dibaca dari gambarnya, bukan dilukis ulang. Kalau keduanya dilukis terpisah,
 * noda pada warnanya dan noda pada kekasarannya akan berdiri di tempat yang
 * berbeda — dan permukaan yang terlihat kotor tetapi memantul seperti bersih
 * justru lebih aneh daripada permukaan yang rata sama sekali.
 */
function turunkanKekasaran(
  sumber: CanvasRenderingContext2D,
  kind: SurfaceKind,
): HTMLCanvasElement | null {
  const tujuan = buatKanvas(TEXTURE_SIZE);
  if (!tujuan) return null;

  const profil = ROUGHNESS_PROFILE[kind];
  const asal = sumber.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const hasil = tujuan.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);

  for (let i = 0; i < asal.data.length; i += 4) {
    // Peta warnanya sudah abu-abu, jadi satu kanal saja sudah mewakili
    // terang-gelapnya dan tidak perlu dihitung luminansinya.
    const terang = asal.data[i] / 255;
    const t = profil.terbalik ? 1 - terang : terang;
    const kasar = profil.min + (profil.max - profil.min) * t;
    const nilai = Math.round(kasar * 255);
    hasil.data[i] = nilai;
    hasil.data[i + 1] = nilai;
    hasil.data[i + 2] = nilai;
    hasil.data[i + 3] = 255;
  }

  tujuan.putImageData(hasil, 0, 0);
  return tujuan.canvas;
}

function siapkan(texture: Texture, warna: boolean): Texture {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  // Peta kekasaran adalah DATA, bukan warna. Menandainya sRGB membuat three
  // mengoreksi gamma angka yang tidak pernah dimaksudkan sebagai warna, dan
  // seluruh permukaan jadi terbaca lebih licin daripada yang ditulis.
  texture.colorSpace = warna ? SRGBColorSpace : NoColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * Tekstur dasar sebuah jenis permukaan, dilukis sekali lalu dipakai ulang.
 *
 * Mengembalikan null di server dan pada peramban tanpa kanvas 2D; pemanggil
 * karena itu selalu memeriksa hasilnya, dan arena tetap bisa dirender dengan
 * warna polos alih-alih gagal.
 */
export function surfaceTextures(kind: SurfaceKind): SurfaceTextures | null {
  const tersimpan = simpanan.get(kind);
  if (tersimpan) return tersimpan;

  const ctx = buatKanvas(TEXTURE_SIZE);
  if (!ctx) return null;

  paintSurface(kind, {
    ctx,
    size: TEXTURE_SIZE,
    rand: seededRandom(SEED[kind]),
  });

  const kasar = turunkanKekasaran(ctx, kind);
  if (!kasar) return null;

  const hasil: SurfaceTextures = {
    map: siapkan(new CanvasTexture(ctx.canvas), true),
    roughnessMap: siapkan(new CanvasTexture(kasar), false),
  };
  simpanan.set(kind, hasil);
  return hasil;
}

/**
 * Berapa kali tekstur diulang pada sebuah bidang seluas `lebar` x `tinggi`
 * satuan dunia.
 *
 * Dibulatkan ke bilangan bulat, dan itu disengaja. Pola di sini punya bentuk
 * yang jelas — nat lantai, bilah peti, paku keling — dan pengulangan pecahan
 * memotong bentuk itu di tengah tepat pada tepi bidang. Satu bilah peti yang
 * terpotong dua per tiga jauh lebih terlihat daripada bilah yang sedikit lebih
 * lebar dari semestinya.
 */
export function tileRepeat(
  kind: SurfaceKind,
  lebar: number,
  tinggi: number,
): [number, number] {
  if (SATU_BENDA.has(kind)) return [1, 1];
  const petak = WORLD_UNITS_PER_TILE[kind];
  return [
    Math.max(1, Math.round(Math.abs(lebar) / petak)),
    Math.max(1, Math.round(Math.abs(tinggi) / petak)),
  ];
}

/**
 * Tekstur dengan pengulangan yang sudah disetel untuk satu bidang.
 *
 * Salinannya berbagi gambar yang sama dengan aslinya — three menyimpan unggahan
 * ke kartu grafis berdasarkan sumber gambarnya, bukan objek teksturnya — jadi
 * sepuluh balok berukuran berbeda tetap hanya menghabiskan satu tekstur di
 * memori kartu grafis, masing-masing dengan pengulangannya sendiri.
 */
export function tiledTextures(
  kind: SurfaceKind,
  lebar: number,
  tinggi: number,
): SurfaceTextures | null {
  const [rx, ry] = tileRepeat(kind, lebar, tinggi);
  const kunci = `${kind}|${rx}|${ry}`;
  const tersimpan = salinan.get(kunci);
  if (tersimpan) return tersimpan;

  const dasar = surfaceTextures(kind);
  if (!dasar) return null;

  const map = dasar.map.clone();
  const roughnessMap = dasar.roughnessMap.clone();
  map.repeat.set(rx, ry);
  roughnessMap.repeat.set(rx, ry);
  map.needsUpdate = true;
  roughnessMap.needsUpdate = true;

  const hasil: SurfaceTextures = { map, roughnessMap };
  salinan.set(kunci, hasil);
  return hasil;
}

/**
 * Pengulangan untuk keenam sisi sebuah balok, urut seperti yang diminta
 * BoxGeometry: +X, -X, +Y, -Y, +Z, -Z.
 *
 * Tiap sisi balok punya ukuran yang berbeda, sementara satu tekstur hanya
 * punya satu pengulangan. Memaksakan satu angka untuk semuanya membuat sisi
 * sempit tertarik memanjang — paling terlihat pada tembok tipis, yang sisi
 * pinggirnya jadi bergaris-garis melar. Yang benar adalah satu material per
 * sisi, dan di sinilah angkanya disiapkan.
 */
export function boxTileRepeats(
  kind: SurfaceKind,
  size: readonly [number, number, number],
): [number, number][] {
  return boxFaceSizes(size).map(([lebar, tinggi]) =>
    tileRepeat(kind, lebar, tinggi),
  );
}

/**
 * Ukuran nyata keenam sisi sebuah balok, urut sama seperti di atas.
 *
 * Dipisah karena pemanggil yang memasang material per sisi butuh ukurannya,
 * bukan pengulangannya — dan kalau ia menurunkan sendiri sisi mana memakai
 * lebar dan sisi mana memakai kedalaman, pemetaan itu hidup di dua tempat dan
 * cukup satu yang salah untuk membuat sebuah sisi bertekstur melintang.
 */
export function boxFaceSizes(
  size: readonly [number, number, number],
): [number, number][] {
  const [w, h, d] = size;
  return [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
}

/**
 * Menaikkan penyaringan anisotropik untuk seluruh tekstur.
 *
 * Lantai arena hampir selalu dilihat nyaris sejajar mata, dan justru pada
 * sudut itulah penyaringan biasa mengaburkan teksturnya jadi bubur abu-abu.
 * Batas yang bisa dipakai berbeda tiap kartu grafis, jadi angkanya datang dari
 * renderer saat kanvas dipasang, bukan ditebak di sini.
 */
export function setTextureAnisotropy(nilai: number): void {
  anisotropy = Math.max(1, Math.floor(nilai));
  for (const set of [...simpanan.values(), ...salinan.values()]) {
    set.map.anisotropy = anisotropy;
    set.roughnessMap.anisotropy = anisotropy;
    set.map.needsUpdate = true;
    set.roughnessMap.needsUpdate = true;
  }
}

/**
 * Membuang seluruh tekstur yang sudah dibangkitkan.
 *
 * Dipakai saat modul dimuat ulang oleh dev server dan oleh pemeriksaan
 * otomatis; permainan sendiri tidak perlu memanggilnya, sebab teksturnya
 * memang dimaksudkan hidup selama halaman terbuka.
 */
export function disposeTextures(): void {
  for (const set of [...salinan.values(), ...simpanan.values()]) {
    set.map.dispose();
    set.roughnessMap.dispose();
  }
  salinan.clear();
  simpanan.clear();
}

export { SURFACE_KINDS, WORLD_UNITS_PER_TILE, TEXTURE_SIZE };
export type { SurfaceKind };
