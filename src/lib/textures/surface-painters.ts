import { fractalNoise } from "@/lib/textures/noise";

/**
 * Pelukis tiap jenis permukaan arena.
 *
 * Semuanya dilukis ABU-ABU, tanpa warna. Warna sebuah balok sudah ditentukan
 * datanya sendiri di katalog peta, dan tiap peta memakai palet yang berbeda —
 * gudang senja kecokelatan, pabrik kebiruan, atap gedung kelabu. Kalau warnanya
 * ikut dilukis di sini, tiap peta butuh satu set teksturnya sendiri dan palet
 * yang sudah disusun itu jadi tidak berlaku. Dengan abu-abu, satu tekstur
 * melayani semua peta: materialnya tinggal mengalikannya dengan warna balok.
 *
 * Gayanya sengaja seperti tekstur awal 2000-an: pola besar yang terbaca dari
 * jauh, kotor di tempat yang masuk akal, dan tidak ada detail sehalus rambut
 * yang toh hilang begitu dinding dilihat dari seberang arena.
 */

export type SurfaceKind = "wall" | "floor" | "crate" | "pillar" | "metal";

export interface PaintContext {
  ctx: CanvasRenderingContext2D;
  /** Sisi kanvas dalam piksel; teksturnya selalu bujur sangkar. */
  size: number;
  rand: () => number;
}

/**
 * Menjalankan sebuah lukisan sembilan kali, tergeser ke seluruh arah.
 *
 * Apa pun yang tergambar melewati tepi kanan otomatis ikut tergambar di tepi
 * kiri, jadi noda dan goresan tidak pernah terpotong di jahitan. Delapan
 * salinan di antaranya memang jatuh di luar kanvas dan langsung dibuang; itu
 * ongkos sekali saat tekstur dibuat, bukan tiap frame.
 */
function wrapped(p: PaintContext, gambar: () => void): void {
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      p.ctx.save();
      p.ctx.translate(dx * p.size, dy * p.size);
      gambar();
      p.ctx.restore();
    }
  }
}

/** Mengisi seluruh kanvas dengan derau, sebagai butiran dasar sebuah bahan. */
function isiDerau(
  p: PaintContext,
  opsi: { dasar: number; kontras: number; grid: number; lapis: number },
): void {
  const noise = fractalNoise(p.rand, opsi.grid, opsi.lapis);
  const gambar = p.ctx.createImageData(p.size, p.size);
  const data = gambar.data;

  for (let y = 0; y < p.size; y += 1) {
    for (let x = 0; x < p.size; x += 1) {
      const n = noise(x / p.size, y / p.size);
      const nilai = Math.max(
        0,
        Math.min(255, opsi.dasar + (n - 0.5) * opsi.kontras),
      );
      const i = (y * p.size + x) * 4;
      data[i] = nilai;
      data[i + 1] = nilai;
      data[i + 2] = nilai;
      data[i + 3] = 255;
    }
  }

  p.ctx.putImageData(gambar, 0, 0);
}

/** Bercak kotor yang menumpuk di beberapa tempat, bukan merata di mana-mana. */
function noda(p: PaintContext, jumlah: number, gelap: number): void {
  for (let i = 0; i < jumlah; i += 1) {
    const cx = p.rand() * p.size;
    const cy = p.rand() * p.size;
    const r = p.size * (0.04 + p.rand() * 0.12);
    const pekat = gelap * (0.4 + p.rand() * 0.6);

    wrapped(p, () => {
      const gradien = p.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradien.addColorStop(0, `rgba(0,0,0,${pekat.toFixed(3)})`);
      gradien.addColorStop(1, "rgba(0,0,0,0)");
      p.ctx.fillStyle = gradien;
      p.ctx.beginPath();
      p.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      p.ctx.fill();
    });
  }
}

/** Beton bertembok: panel besar, sambungan mendatar, dan air kotor yang meleleh. */
function paintWall(p: PaintContext): void {
  const { ctx, size } = p;
  isiDerau(p, { dasar: 150, kontras: 46, grid: 4, lapis: 4 });

  // Sambungan panel: satu garis mendatar di tengah, karena panel beton
  // dicetak per lembar dan justru garis itu yang membuat tembok terbaca
  // sebagai tembok, bukan bidang abu-abu yang kebetulan berbintik.
  const sambungan = size / 2;
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fillRect(0, sambungan - size * 0.012, size, size * 0.024);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(0, sambungan + size * 0.012, size, size * 0.008);

  // Lelehan air dari sambungan ke bawah. Selalu menggantung DARI garisnya,
  // sebab itulah satu-satunya tempat air bisa merembes keluar.
  const lelehan = 7 + Math.floor(p.rand() * 6);
  for (let i = 0; i < lelehan; i += 1) {
    const x = p.rand() * size;
    const lebar = size * (0.006 + p.rand() * 0.02);
    const panjang = size * (0.1 + p.rand() * 0.34);
    wrapped(p, () => {
      const gradien = ctx.createLinearGradient(
        0,
        sambungan,
        0,
        sambungan + panjang,
      );
      gradien.addColorStop(0, "rgba(0,0,0,0.26)");
      gradien.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradien;
      ctx.fillRect(x, sambungan, lebar, panjang);
    });
  }

  noda(p, 10, 0.2);
}

/** Lantai beton: empat lempeng per petak dengan nat yang menjorok. */
function paintFloor(p: PaintContext): void {
  const { ctx, size } = p;
  isiDerau(p, { dasar: 138, kontras: 40, grid: 5, lapis: 4 });

  // Dua kali dua lempeng. Garisnya jatuh tepat di 0, setengah, dan penuh,
  // jadi petak yang bersebelahan menyambungkan natnya sendiri tanpa
  // perhitungan tambahan.
  // Tiap garis digambar SEKALI. Nat di tepi 0 dan tepi `size` adalah dua
  // separuh dari satu garis yang sama: separuh bawahnya jatuh di petak ini,
  // separuh atasnya di petak sebelahnya. Menggambar salah satunya dua kali —
  // misalnya karena ikut berulang di dalam loop — menggelapkannya berlipat,
  // dan garis yang lebih pekat daripada nat lain itulah yang justru menandai
  // di mana petaknya berakhir.
  const nat = Math.max(2, size * 0.014);
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  for (const t of [0, size / 2, size]) {
    ctx.fillRect(0, t - nat / 2, size, nat);
    ctx.fillRect(t - nat / 2, 0, nat, size);
  }

  // Tengah tiap lempeng lebih terang: itu bagian yang paling sering diinjak
  // sehingga kotorannya justru terkikis.
  for (const cx of [size * 0.25, size * 0.75]) {
    for (const cy of [size * 0.25, size * 0.75]) {
      const gradien = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
      gradien.addColorStop(0, "rgba(255,255,255,0.09)");
      gradien.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradien;
      ctx.fillRect(0, 0, size, size);
    }
  }

  // Retak rambut, supaya betonnya tidak terbaca sebagai ubin baru.
  const retak = 3 + Math.floor(p.rand() * 3);
  for (let i = 0; i < retak; i += 1) {
    let x = p.rand() * size;
    let y = p.rand() * size;
    const langkah = 6 + Math.floor(p.rand() * 8);
    const titik: [number, number][] = [[x, y]];
    for (let s = 0; s < langkah; s += 1) {
      x += (p.rand() - 0.5) * size * 0.1;
      y += (p.rand() - 0.5) * size * 0.1;
      titik.push([x, y]);
    }
    wrapped(p, () => {
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = Math.max(1, size * 0.004);
      ctx.beginPath();
      ctx.moveTo(titik[0][0], titik[0][1]);
      for (const [tx, ty] of titik.slice(1)) ctx.lineTo(tx, ty);
      ctx.stroke();
    });
  }

  noda(p, 8, 0.16);
}

/** Peti kayu: bilah tegak, serat, dan sabuk logam di atas dan bawah. */
function paintCrate(p: PaintContext): void {
  const { ctx, size } = p;
  isiDerau(p, { dasar: 146, kontras: 30, grid: 3, lapis: 3 });

  // Bilah tegak. Jumlahnya membagi habis sisi kanvas supaya celah terakhir
  // bertemu celah pertama saat peti di sebelahnya dimulai.
  const bilah = 4;
  const lebar = size / bilah;
  for (let i = 0; i < bilah; i += 1) {
    const x = i * lebar;

    // Tiap bilah diberi terang sendiri; kayu yang benar-benar seragam
    // terbaca sebagai plastik.
    const beda = (p.rand() - 0.5) * 0.12;
    ctx.fillStyle =
      beda >= 0
        ? `rgba(255,255,255,${beda.toFixed(3)})`
        : `rgba(0,0,0,${(-beda).toFixed(3)})`;
    ctx.fillRect(x, 0, lebar, size);

    // Celah antar bilah, digelapkan di kiri dan disorot tipis di kanan
    // supaya terbaca sebagai alur, bukan garis yang dicat.
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(x, 0, Math.max(1, size * 0.01), size);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(x + Math.max(1, size * 0.01), 0, Math.max(1, size * 0.006), size);

    // Serat kayu memanjang searah bilahnya.
    const serat = 5 + Math.floor(p.rand() * 5);
    for (let s = 0; s < serat; s += 1) {
      const sx = x + lebar * (0.15 + p.rand() * 0.7);
      ctx.fillStyle = `rgba(0,0,0,${(0.05 + p.rand() * 0.1).toFixed(3)})`;
      ctx.fillRect(sx, 0, Math.max(1, size * 0.004), size);
    }
  }

  // Sabuk logam di tepi atas dan bawah. Posisinya di tepi, jadi sabuk bawah
  // sebuah petak bertemu sabuk atas petak berikutnya dan keduanya terbaca
  // sebagai satu sabuk utuh di antara dua peti yang ditumpuk.
  //
  // Sorotan selalu di sisi LUAR, bayangan selalu di sisi DALAM — bukan
  // dua-duanya menghadap bawah. Kalau sorotan dan bayangan berseberangan,
  // tepat di tempat dua peti bertemu muncul bayangan yang langsung disusul
  // sorotan, dan pasangan gelap-terang setajam itu terbaca sebagai garis
  // potong, bukan sebagai logam.
  const sabuk = size * 0.1;
  const garis = Math.max(1, size * 0.012);
  for (const atas of [true, false]) {
    const y = atas ? 0 : size - sabuk;
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.fillRect(0, y, size, sabuk);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(0, atas ? y : y + sabuk - garis, size, garis);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, atas ? y + sabuk - garis : y, size, garis);

    // Paku keling di sepanjang sabuk.
    const jumlah = 6;
    for (let i = 0; i < jumlah; i += 1) {
      const cx = (i + 0.5) * (size / jumlah);
      const cy = y + sabuk / 2;
      const r = Math.max(1, size * 0.012);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.beginPath();
      ctx.arc(cx + r * 0.3, cy + r * 0.3, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  noda(p, 5, 0.14);
}

/** Pilar beton: guratan tegak dan kaki yang lebih kotor. */
function paintPillar(p: PaintContext): void {
  const { ctx, size } = p;
  isiDerau(p, { dasar: 144, kontras: 38, grid: 3, lapis: 4 });

  // Guratan tegak dari cetakan. Pilar dicor berdiri, jadi bekasnya pun tegak —
  // arah itu sekaligus yang membuat pilar terbaca tinggi.
  const guratan = 14 + Math.floor(p.rand() * 8);
  for (let i = 0; i < guratan; i += 1) {
    const x = p.rand() * size;
    const lebar = size * (0.004 + p.rand() * 0.016);
    const gelap = 0.06 + p.rand() * 0.14;
    wrapped(p, () => {
      ctx.fillStyle = `rgba(0,0,0,${gelap.toFixed(3)})`;
      ctx.fillRect(x, 0, lebar, size);
    });
  }

  // Cincin sambungan bekisting, seperempat dari atas dan bawah.
  for (const y of [size * 0.25, size * 0.75]) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, y, size, Math.max(1, size * 0.012));
  }

  noda(p, 7, 0.18);
}

/** Pelat logam: permukaan disikat, paku keling di sudut, dan goresan. */
function paintMetal(p: PaintContext): void {
  const { ctx, size } = p;
  isiDerau(p, { dasar: 156, kontras: 24, grid: 4, lapis: 3 });

  // Sikatan mendatar. Logam giling selalu punya arah, dan tanpa arah itu
  // pelatnya terbaca sebagai beton terang.
  const sikat = 90;
  for (let i = 0; i < sikat; i += 1) {
    const y = p.rand() * size;
    const terang = p.rand() > 0.5;
    ctx.fillStyle = terang
      ? `rgba(255,255,255,${(0.02 + p.rand() * 0.05).toFixed(3)})`
      : `rgba(0,0,0,${(0.02 + p.rand() * 0.05).toFixed(3)})`;
    ctx.fillRect(0, y, size, Math.max(1, size * 0.004));
  }

  // Tepi pelat: gelap di luar, sorot tipis di dalam. Digambar di keempat sisi
  // supaya petak yang bersebelahan membentuk satu alur bersama.
  const tepi = Math.max(1, size * 0.016);
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.fillRect(0, 0, size, tepi);
  ctx.fillRect(0, size - tepi, size, tepi);
  ctx.fillRect(0, 0, tepi, size);
  ctx.fillRect(size - tepi, 0, tepi, size);

  // Paku keling di keempat sudut. Karena tepat di sudut, empat petak yang
  // bertemu menyusun satu paku utuh di antara mereka.
  const r = Math.max(2, size * 0.026);
  for (const cx of [0, size]) {
    for (const cy of [0, size]) {
      wrapped(p, () => {
        ctx.fillStyle = "rgba(255,255,255,0.20)";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.arc(cx + r * 0.25, cy + r * 0.25, r * 0.66, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  // Goresan acak, tanda pelat yang sudah lama dipakai.
  const gores = 10 + Math.floor(p.rand() * 8);
  for (let i = 0; i < gores; i += 1) {
    const x = p.rand() * size;
    const y = p.rand() * size;
    const panjang = size * (0.06 + p.rand() * 0.2);
    const sudut = (p.rand() - 0.5) * 0.5;
    wrapped(p, () => {
      ctx.strokeStyle = `rgba(255,255,255,${(0.06 + p.rand() * 0.1).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, size * 0.003);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(sudut) * panjang, y + Math.sin(sudut) * panjang);
      ctx.stroke();
    });
  }

  noda(p, 6, 0.12);
}

const PELUKIS: Record<SurfaceKind, (p: PaintContext) => void> = {
  wall: paintWall,
  floor: paintFloor,
  crate: paintCrate,
  pillar: paintPillar,
  metal: paintMetal,
};

/**
 * Seberapa kasar tiap bahan, dinyatakan sebagai rentang yang dipetakan dari
 * terang-gelapnya peta warna.
 *
 * Kekasaran diturunkan dari gambar yang SUDAH dilukis, bukan dilukis kedua
 * kalinya. Dengan begitu bercak kotor pada peta warna otomatis jadi bercak
 * kasar pada kekasarannya, dan keduanya mustahil bergeser sendiri-sendiri.
 *
 * `terbalik` menentukan arah pemetaannya. Pada beton dan kayu, bagian yang
 * lebih gelap adalah kotoran, dan kotoran memantulkan cahaya lebih baur, jadi
 * gelap berarti lebih kasar. Pada logam justru sebaliknya: yang terang adalah
 * bagian yang masih terkikis mengilap.
 */
export const ROUGHNESS_PROFILE: Record<
  SurfaceKind,
  { min: number; max: number; terbalik: boolean }
> = {
  wall: { min: 0.78, max: 0.98, terbalik: true },
  floor: { min: 0.74, max: 0.96, terbalik: true },
  crate: { min: 0.68, max: 0.92, terbalik: true },
  pillar: { min: 0.76, max: 0.97, terbalik: true },
  metal: { min: 0.32, max: 0.72, terbalik: false },
};

/** Melukis satu jenis permukaan ke konteks kanvas yang sudah disiapkan. */
export function paintSurface(kind: SurfaceKind, p: PaintContext): void {
  PELUKIS[kind](p);
}

export const SURFACE_KINDS = Object.keys(PELUKIS) as SurfaceKind[];
