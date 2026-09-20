/**
 * Keacakan yang bisa diulang, dipakai seluruh pembangkit tekstur.
 *
 * Dipisah dari pelukisnya karena dua sifatnya sama-sama penting dan sama-sama
 * mudah hilang kalau ditulis sambil lalu.
 *
 * Pertama, acaknya harus BISA DIULANG. `Math.random` membuat dinding yang sama
 * bernoda berbeda tiap kali halaman dimuat — pemain yang hafal sebuah sudut
 * arena akan merasa petanya berubah sendiri — dan membuat hasilnya mustahil
 * diperiksa, sebab tidak ada dua jalannya yang menghasilkan gambar sama.
 *
 * Kedua, deraunya harus MENYAMBUNG DI TEPI. Tekstur di sini dipasang berulang
 * pada permukaan yang jauh lebih besar daripada satu petaknya, jadi tepi kanan
 * selalu bertemu tepi kiri. Derau yang tidak menyambung meninggalkan garis
 * jahitan yang rapi berjajar di sepanjang tembok, dan justru keteraturan itu
 * yang membuatnya langsung terlihat.
 */

/**
 * Pembangkit acak mulberry32: kecil, cepat, dan sepenuhnya ditentukan benihnya.
 *
 * Benih yang sama selalu menghasilkan urutan yang sama, sehingga satu nomor
 * benih cukup untuk menjadikan seluruh tekstur sebuah peta bisa dibangun ulang
 * persis sama di mesin mana pun.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Kurva smoothstep, supaya perpindahan antar titik kisi tidak berupa garis patah. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Derau nilai pada kisi yang MELINGKAR.
 *
 * Kuncinya ada pada pengambilan titik kisi yang memakai sisa bagi: titik di
 * luar kisi kanan sebenarnya titik di kisi paling kiri. Karena itu nilai pada
 * u = 0 dan u = 1 dijamin identik, dan teksturnya menyambung tanpa perlu
 * dijahit belakangan.
 *
 * Mengembalikan fungsi yang menerima koordinat 0..1 dan memberi nilai 0..1.
 */
export function tileableNoise(
  rand: () => number,
  grid: number,
): (u: number, v: number) => number {
  const titik = new Float32Array(grid * grid);
  for (let i = 0; i < titik.length; i += 1) titik[i] = rand();

  const ambil = (ix: number, iy: number): number => {
    const x = ((ix % grid) + grid) % grid;
    const y = ((iy % grid) + grid) % grid;
    return titik[y * grid + x];
  };

  return (u, v) => {
    const x = u * grid;
    const y = v * grid;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smoothstep(x - x0);
    const fy = smoothstep(y - y0);

    const atas = ambil(x0, y0) * (1 - fx) + ambil(x0 + 1, y0) * fx;
    const bawah = ambil(x0, y0 + 1) * (1 - fx) + ambil(x0 + 1, y0 + 1) * fx;
    return atas * (1 - fy) + bawah * fy;
  };
}

/**
 * Beberapa lapis derau yang ditumpuk, tiap lapis dua kali lebih rapat dan
 * setengah lebih lemah.
 *
 * Satu lapis saja menghasilkan permukaan yang bergelombang rata — terbaca
 * sebagai kain, bukan beton. Lapisan halus di atasnya yang memberi butiran,
 * dan itulah yang membuat mata menerimanya sebagai bahan yang kasar.
 *
 * Tiap lapis memakai kisi yang tetap melingkar, jadi jumlahnya pun masih
 * menyambung di tepi.
 */
export function fractalNoise(
  rand: () => number,
  gridAwal: number,
  lapis: number,
): (u: number, v: number) => number {
  const lapisan: { noise: (u: number, v: number) => number; bobot: number }[] =
    [];
  let grid = gridAwal;
  let bobot = 1;
  let total = 0;

  for (let i = 0; i < lapis; i += 1) {
    lapisan.push({ noise: tileableNoise(rand, grid), bobot });
    total += bobot;
    grid *= 2;
    bobot /= 2;
  }

  return (u, v) => {
    let nilai = 0;
    for (const l of lapisan) nilai += l.noise(u, v) * l.bobot;
    return nilai / total;
  };
}
