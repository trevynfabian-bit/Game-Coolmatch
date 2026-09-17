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
  /**
   * Benar bila pusat arena ditempati bangunan — panggung, helipad — alih-alih
   * lantai kosong. Peta dengan pusat yang ditempati punya satu titik rebutan
   * yang jelas; yang pusatnya kosong tidak.
   */
  hasCentralStructure: boolean;
  /**
   * Jalur tembus sisi-ke-sisi yang TIDAK terlihat dari pusat arena.
   *
   * Inilah yang membuat mengapit mungkin: nol berarti siapa pun yang menguasai
   * tengah melihat setiap perpindahan, dan satu-satunya cara maju adalah maju
   * terang-terangan.
   */
  hiddenRouteCount: number;
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
/**
 * Petak area main, ditandai terhalang atau tidak setinggi dada.
 *
 * Dipisah karena dipakai tiga pengukuran sekaligus — jarak pandang, keterbukaan,
 * dan jalur tersembunyi. Membangunnya ulang di masing-masing berarti tiga
 * salinan aturan "apa yang dianggap menghalangi", dan yang paling mungkin
 * berselisih justru aturan itu.
 */
interface SightGrid {
  blocked: boolean[][];
  cols: number;
  rows: number;
}

function buildSightGrid(map: ArenaMapInfo): SightGrid {
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

  return { blocked, cols, rows };
}

function measureTypicalSightline({ blocked, cols, rows }: SightGrid): number {
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

/**
 * Bagian tengah arena, sebagai pecahan dari sisinya.
 *
 * Seperempat, bukan satu petak: panggung Gudang Senja selebar 12 satuan di
 * arena 45 satuan tidak duduk tepat di titik nol, dan "pusat" yang diartikan
 * sesempit satu petak akan menyebut arena berpanggung sebagai arena kosong.
 */
const CENTRE_FRACTION = 0.25;

/** Benar bila ada bangunan — bukan tembok keliling — menempati pusat arena. */
function detectCentralStructure(map: ArenaMapInfo): boolean {
  const { minX, maxX, minZ, maxZ } = map.playableBounds;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const half = (Math.max(maxX - minX, maxZ - minZ) * CENTRE_FRACTION) / 2;

  return map.blocks.some((b) => {
    if (PERIMETER_IDS.has(b.id)) return false;
    /*
      Harus berupa PANGGUNG, bukan sekadar balok yang kebetulan berdiri di
      tengah. Bedanya menentukan: panggung ditempati dan diperebutkan, sedangkan
      dinding pembelah justru memisahkan — memanggil keduanya "pusat yang
      ditempati" akan menyebut Lorong Pabrik, yang dibelah dua dinding panjang
      jadi tiga jalur, sebagai peta berpanggung tengah. Krat setinggi dada di
      titik tengah juga bukan panggung; itu penghalang, dan sudah terhitung
      sebagai cover.
    */
    if (b.kind !== "platform") return false;
    return (
      Math.abs(b.position[0] - cx) <= half + b.size[0] / 2 &&
      Math.abs(b.position[2] - cz) <= half + b.size[2] / 2
    );
  });
}

/** Petak yang terlihat dari pusat arena, ditembakkan garis lurus di atas petak. */
function markVisibleFromCentre({
  blocked,
  cols,
  rows,
}: SightGrid): boolean[][] {
  const c0 = Math.floor(cols / 2);
  const r0 = Math.floor(rows / 2);

  const visible: boolean[][] = Array.from({ length: rows }, () =>
    new Array<boolean>(cols).fill(false),
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (blocked[r][c]) continue;

      // Garis lurus dari pusat ke petak ini; berhenti begitu ada yang
      // memotongnya. Petak tujuannya sendiri tidak ikut memotong.
      const dc = c - c0;
      const dr = r - r0;
      const langkah = Math.max(Math.abs(dc), Math.abs(dr));
      let tembus = true;
      for (let i = 1; i < langkah; i++) {
        const cc = Math.round(c0 + (dc * i) / langkah);
        const rr = Math.round(r0 + (dr * i) / langkah);
        if (blocked[rr][cc]) {
          tembus = false;
          break;
        }
      }
      if (tembus) visible[r][c] = true;
    }
  }

  return visible;
}

/**
 * Berapa banyak jalur tembus sisi-ke-sisi yang tidak terlihat dari pusat.
 *
 * Petak yang bebas TAPI tidak terlihat dari pusat dikelompokkan jadi kumpulan
 * yang saling bersambung, lalu dihitung berapa kumpulan yang benar-benar
 * mencapai dua sisi berseberangan — barat ke timur, atau utara ke selatan.
 * Syarat "mencapai dua sisi" itu yang membedakan jalur memutar dari sekadar
 * sudut gelap: sudut yang tidak menuju ke mana-mana bukan jalur.
 */
function countHiddenRoutes(grid: SightGrid): number {
  const { blocked, cols, rows } = grid;
  const visible = markVisibleFromCentre(grid);

  const seen: boolean[][] = Array.from({ length: rows }, () =>
    new Array<boolean>(cols).fill(false),
  );

  let routes = 0;

  for (let r0 = 0; r0 < rows; r0++) {
    for (let c0 = 0; c0 < cols; c0++) {
      if (seen[r0][c0] || blocked[r0][c0] || visible[r0][c0]) continue;

      let barat = false;
      let timur = false;
      let utara = false;
      let selatan = false;

      const antre: Array<[number, number]> = [[r0, c0]];
      seen[r0][c0] = true;

      while (antre.length > 0) {
        const [r, c] = antre.pop()!;
        if (c === 0) barat = true;
        if (c === cols - 1) timur = true;
        if (r === 0) utara = true;
        if (r === rows - 1) selatan = true;

        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
          if (seen[rr][cc] || blocked[rr][cc] || visible[rr][cc]) continue;
          seen[rr][cc] = true;
          antre.push([rr, cc]);
        }
      }

      if ((barat && timur) || (utara && selatan)) routes++;
    }
  }

  return routes;
}

export function mapFacts(map: ArenaMapInfo): MapFacts {
  const { minX, maxX, minZ, maxZ } = map.playableBounds;
  const span = Math.round(Math.max(maxX - minX, maxZ - minZ));
  const area = (maxX - minX) * (maxZ - minZ);
  const coverCount = map.blocks.filter((b) => !PERIMETER_IDS.has(b.id)).length;

  const grid = buildSightGrid(map);

  return {
    span,
    area,
    maxBots: maxBotsForMap(map),
    coverCount,
    typicalSightline: measureTypicalSightline(grid),
    hasCentralStructure: detectCentralStructure(map),
    hiddenRouteCount: countHiddenRoutes(grid),
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
 * Kata sehari-hari untuk tata letak arena.
 *
 * Panggung diperiksa lebih dulu karena ia yang paling menentukan cara peta
 * dimainkan: ada satu tempat tinggi yang diperebutkan, dan segala sesuatu
 * berputar di sekitarnya. Tanpa panggung, yang membedakan tinggal apakah
 * pandangannya cepat terpotong — itulah peta berjalur — atau tidak.
 */
export function layoutWord(facts: MapFacts): string {
  if (facts.hasCentralStructure) return "Panggung tengah";
  if (facts.typicalSightline < SIGHT_CLOSE) return "Berjalur";
  return "Terbuka";
}

/**
 * Kata sehari-hari untuk jalur yang tidak terlihat dari pusat arena.
 *
 * Nol bukan sekadar "sedikit" — ia berarti setiap perpindahan terlihat oleh
 * siapa pun yang menguasai tengah, dan itu mengubah cara peta dimainkan lebih
 * daripada selisih satu jalur mana pun. Karena itu ia punya kalimatnya sendiri.
 */
export function flankWord(facts: MapFacts): string {
  if (facts.hiddenRouteCount === 0) return "Tidak ada jalur memutar";
  if (facts.hiddenRouteCount === 1) return "Satu jalur memutar";
  return "Beberapa jalur memutar";
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
