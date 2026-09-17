import { maxBotsForMap } from "@/lib/mock/bots";
import type { ArenaMapInfo } from "@/types/game";

/**
 * Keterangan sebuah peta yang bisa DIHITUNG dari bentuknya sendiri.
 *
 * Semuanya diturunkan, tidak satu pun ditulis tangan di katalog. Alasannya:
 * angka yang ditulis tangan cepat atau lambat berselisih dengan petanya —
 * seseorang menambah krat lalu lupa memperbarui keterangan "cover sedang", dan
 * daftar peta mulai berbohong. Diturunkan berarti selalu benar.
 */
export interface MapFacts {
  /** Panjang sisi area main dalam satuan dunia. */
  span: number;
  /** Luas area main; dipakai membandingkan ukuran antar peta. */
  area: number;
  /** Lawan terbanyak yang muat, dibatasi titik spawn peta. */
  maxBots: number;
  /** Penghalang di dalam arena, tidak menghitung tembok keliling. */
  coverCount: number;
  /**
   * Jarak pandang yang KHAS di peta ini, dalam satuan dunia: seberapa jauh
   * pandangan biasanya menembus sebelum terpotong sesuatu.
   *
   * Sengaja nilai tengah, bukan yang terpanjang. Setiap arena persegi punya
   * lorong kosong menyusur temboknya, jadi garis terpanjang selalu selebar
   * arena — angka yang sama untuk peta paling sesak maupun paling lapang, dan
   * karena itu tidak memberi tahu apa pun.
   */
  typicalSightline: number;
}

/** Tembok keliling selalu ada di tiap peta, jadi tidak dihitung sebagai cover. */
const PERIMETER_IDS = new Set([
  "wall-utara",
  "wall-selatan",
  "wall-barat",
  "wall-timur",
]);

/**
 * Tinggi minimal sebuah balok agar dianggap memutus pandangan.
 *
 * Yang lebih rendah dari ini — panggung, helipad, ramp landai — memang bisa
 * dinaiki dan dijadikan tempat berpijak, tetapi tidak menghalangi siapa pun
 * melihat seberang arena, jadi tidak boleh ikut dihitung.
 */
const SIGHT_BLOCK_HEIGHT = 1.5;

/** Langkah sampling saat mengukur jarak pandang, dalam satuan dunia. */
const SAMPLE_STEP = 1;

/**
 * Jarak pandang yang khas di sebuah peta.
 *
 * Diukur, bukan ditaksir dari jumlah balok. Sebabnya nyata: peta yang dibelah
 * beberapa dinding PANJANG hanya punya sedikit balok, sehingga hitungan
 * berbasis jumlah akan menyebutnya "terbuka" padahal justru paling tertutup.
 *
 * Areanya dipetak per satu satuan, tiap petak ditandai terhalang atau tidak,
 * lalu tiap baris dan tiap kolom diukur deretan petak bebas terpanjangnya.
 * Yang diambil adalah NILAI TENGAH dari seluruh garis itu, bukan yang
 * terpanjang: garis terpanjang selalu jatuh ke lorong kosong yang menyusur
 * tembok — ada di setiap arena persegi — sehingga peta paling sesak dan paling
 * lapang sama-sama mendapat angka selebar arenanya. Nilai tengah menjawab
 * pertanyaan yang sebenarnya: seberapa jauh pandangan BIASANYA menembus.
 */
function measureTypicalSightline(map: ArenaMapInfo): number {
  const { minX, maxX, minZ, maxZ } = map.playableBounds;

  const walls = map.blocks.filter((block) => {
    const top = block.position[1] + block.size[1] / 2;
    const bottom = block.position[1] - block.size[1] / 2;
    // Balok melayang di atas kepala tidak menghalangi pandangan mendatar.
    return top >= SIGHT_BLOCK_HEIGHT && bottom <= SIGHT_BLOCK_HEIGHT;
  });

  const cols = Math.max(1, Math.round((maxX - minX) / SAMPLE_STEP));
  const rows = Math.max(1, Math.round((maxZ - minZ) / SAMPLE_STEP));

  const blocked: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    const z = minZ + (r + 0.5) * SAMPLE_STEP;
    const baris: boolean[] = [];
    for (let c = 0; c < cols; c++) {
      const x = minX + (c + 0.5) * SAMPLE_STEP;
      baris.push(
        walls.some(
          (b) =>
            x >= b.position[0] - b.size[0] / 2 &&
            x <= b.position[0] + b.size[0] / 2 &&
            z >= b.position[2] - b.size[2] / 2 &&
            z <= b.position[2] + b.size[2] / 2,
        ),
      );
    }
    blocked.push(baris);
  }

  /** Deretan petak bebas terpanjang di satu garis. */
  const runTerpanjang = (panjang: number, terhalang: (i: number) => boolean) => {
    let jalan = 0;
    let terbaik = 0;
    for (let i = 0; i < panjang; i++) {
      jalan = terhalang(i) ? 0 : jalan + 1;
      if (jalan > terbaik) terbaik = jalan;
    }
    return terbaik;
  };

  const garis: number[] = [];
  for (let r = 0; r < rows; r++) {
    garis.push(runTerpanjang(cols, (c) => blocked[r][c]));
  }
  for (let c = 0; c < cols; c++) {
    garis.push(runTerpanjang(rows, (r) => blocked[r][c]));
  }

  garis.sort((a, b) => a - b);
  const tengah = garis[Math.floor(garis.length / 2)] ?? 0;
  return tengah * SAMPLE_STEP;
}

export function mapFacts(map: ArenaMapInfo): MapFacts {
  const { minX, maxX, minZ, maxZ } = map.playableBounds;
  const span = Math.round(Math.max(maxX - minX, maxZ - minZ));
  const area = (maxX - minX) * (maxZ - minZ);
  const coverCount = map.blocks.filter((b) => !PERIMETER_IDS.has(b.id)).length;

  return {
    span,
    area,
    maxBots: maxBotsForMap(map),
    coverCount,
    typicalSightline: measureTypicalSightline(map),
  };
}

/** Kata sehari-hari untuk ukuran peta, dibandingkan terhadap peta lain. */
export function sizeWord(facts: MapFacts, semua: MapFacts[]): string {
  const luas = semua.map((f) => f.area).sort((a, b) => a - b);
  if (facts.area <= luas[0]) return "Sempit";
  if (facts.area >= luas[luas.length - 1]) return "Luas";
  return "Sedang";
}

/**
 * Ambang jarak pandang, dalam satuan dunia.
 *
 * Sengaja angka MUTLAK, bukan pecahan dari lebar peta. Yang dirasakan pemain
 * adalah jarak sebenarnya — sejauh mana ia bisa ditembak sebelum sempat
 * mendekat — dan jarak itu tidak berubah artinya hanya karena arenanya
 * kebetulan lebih lapang. Ukuran petanya sendiri sudah punya keterangan
 * tersendiri, jadi menyatakan keduanya sebagai pecahan yang sama hanya
 * membuat dua keterangan yang mengatakan hal serupa.
 */
const SIGHT_CLOSE = 18;
const SIGHT_MEDIUM = 32;

/** Kata sehari-hari untuk jarak pandang khas sebuah peta. */
export function sightWord(facts: MapFacts): string {
  if (facts.typicalSightline < SIGHT_CLOSE) return "Serba tikungan";
  if (facts.typicalSightline < SIGHT_MEDIUM) return "Jarak menengah";
  return "Tembus pandang";
}

/**
 * Satu kalimat yang menerangkan rasa bertarung di peta ini, disusun dari dua
 * hal yang benar-benar diukur: seberapa luas arenanya dan seberapa jauh
 * pandangan bisa menembus.
 */
export function mapFeel(facts: MapFacts, semua: MapFacts[]): string {
  const ukuran = sizeWord(facts, semua);
  if (facts.typicalSightline < SIGHT_CLOSE) {
    return "Pandangan cepat terpotong; kemenangan biasanya jatuh ke yang lebih dulu menyadari ada orang di tikungan.";
  }
  if (facts.typicalSightline < SIGHT_MEDIUM) {
    return "Campuran duel jarak dekat dan menengah, dengan beberapa titik rebutan yang terbuka.";
  }
  return ukuran === "Luas"
    ? "Ada garis tembak sepanjang hampir seluruh arena — senjata jarak jauh terasa gunanya, dan tempat terbuka berbahaya."
    : "Arenanya tidak besar, tetapi hampir semuanya terlihat dari ujung ke ujung.";
}
