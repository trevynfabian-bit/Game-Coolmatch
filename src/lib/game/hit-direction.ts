/**
 * Penunjuk arah kena di tepi layar.
 *
 * Arah datangnya peluru adalah kabar yang harus sampai tanpa dibaca. Menaruh
 * penunjuknya di dekat crosshair memaksa pemain memindahkan pandangan ke
 * tengah, padahal yang ia butuhkan justru menoleh ke ARAH lain; menaruhnya di
 * tepi layar membuat penglihatan tepi yang menangkapnya, dan tengah layar
 * tetap bersih untuk membidik.
 *
 * Angkanya ditaruh di sini, terpisah dari komponennya, supaya bisa diperiksa
 * tanpa browser — termasuk konvensi sudutnya, yang diukur dari arena dan bukan
 * diturunkan dari perkiraan sumbu koordinat.
 */

/**
 * Seberapa jauh penunjuk dari tengah layar, sebagai pecahan dari sisi
 * TERPENDEK jendela.
 *
 * Mengikuti sisi terpendek supaya penunjuk tidak pernah keluar layar saat
 * berputar: pada jendela lebar, lingkaran yang menyinggung tepi atas akan
 * melewati tepi kiri dan kanan bila jari-jarinya mengikuti sisi terpanjang.
 */
export const EDGE_FRACTION = 0.41;

/** Jarak penunjuk dari tengah layar dalam piksel, untuk sebuah jendela. */
export function edgeRadius(width: number, height: number): number {
  const sisi = Math.min(
    Number.isFinite(width) ? width : 0,
    Number.isFinite(height) ? height : 0,
  );
  return Math.max(0, sisi) * EDGE_FRACTION;
}

/** Lama penunjuk bertahan di layar, milidetik. */
export const ARROW_MS = 1500;

/**
 * Tebal goresan penunjuk menurut beratnya tembakan, 0..1 dari nyawa penuh.
 *
 * Tidak pernah setipis garis rambut: serempetan yang tidak terlihat sama saja
 * dengan tidak memberi tahu arahnya.
 */
export function arrowStroke(severity: number): number {
  const s = Number.isFinite(severity) ? Math.min(1, Math.max(0, severity)) : 0;
  return 5 + s * 7;
}

/** Lebar busur penunjuk dalam derajat; tembakan berat menyapu lebih lebar. */
export function arrowSpread(severity: number): number {
  const s = Number.isFinite(severity) ? Math.min(1, Math.max(0, severity)) : 0;
  return 26 + s * 22;
}

export type DirectionSide = "depan" | "kanan" | "kiri" | "belakang";

/**
 * Sisi mana penembaknya, dibahasakan.
 *
 * Konvensi sudutnya: nol tepat di depan, POSITIF di sebelah kanan pemain,
 * negatif di sebelah kiri — sama dengan yang dipakai penempatan bunyi
 * tembakan, supaya mata dan telinga tidak pernah menunjuk arah berbeda.
 */
export function directionSide(angleRad: number): DirectionSide {
  if (!Number.isFinite(angleRad)) return "depan";
  // Dinormalkan ke -π..π lebih dulu, sebab sudut mentahnya boleh berputar
  // berkali-kali saat pemain terus menoleh ke satu arah.
  const a = Math.atan2(Math.sin(angleRad), Math.cos(angleRad));
  const besar = Math.abs(a);
  if (besar <= Math.PI / 4) return "depan";
  if (besar >= (3 * Math.PI) / 4) return "belakang";
  return a > 0 ? "kanan" : "kiri";
}

/** Keterangan singkat untuk pembaca layar dan pengujian. */
export function directionText(name: string, angleRad: number): string {
  const sisi = directionSide(angleRad);
  if (sisi === "depan") return `${name} menembak dari depan`;
  if (sisi === "belakang") return `${name} menembak dari belakang`;
  return `${name} menembak dari sebelah ${sisi}`;
}

/**
 * Jarak minimum antar penunjuk, radian (sekitar 26 derajat).
 *
 * Dua penyerang yang kebetulan berdiri pada arah yang hampir sama menggambar
 * busur yang saling menimpa, dan dua nama yang bertumpuk terbaca sebagai satu
 * coretan. Memisahkannya sedikit membuat keduanya terbaca — arah yang
 * bergeser dua puluh derajat masih menunjuk ke sisi yang benar, sementara dua
 * busur yang menyatu tidak menunjuk ke mana pun.
 */
export const MIN_ARROW_GAP = 0.46;

/**
 * Menjauhkan sudut-sudut yang terlalu berdekatan, tanpa mengubah urutan
 * masukannya.
 *
 * Bekerja di atas lingkaran: pasangan yang berdekatan saling didorong ke arah
 * berlawanan, beberapa kali, sampai jaraknya cukup. Bila penunjuknya terlalu
 * banyak untuk muat dengan jarak itu, seluruhnya disebar rata — lebih baik
 * semuanya agak meleset daripada beberapa menumpuk total.
 */
export function separateAngles(
  angles: readonly number[],
  minGap: number = MIN_ARROW_GAP,
): number[] {
  const n = angles.length;
  if (n <= 1) return [...angles];

  const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const hasil = angles.map((a) => (Number.isFinite(a) ? norm(a) : 0));

  // Tidak muat: sebar rata mengelilingi arah rata-ratanya.
  if (n * minGap >= Math.PI * 2) {
    const x = hasil.reduce((s, a) => s + Math.cos(a), 0);
    const y = hasil.reduce((s, a) => s + Math.sin(a), 0);
    const pusat = Math.atan2(y, x);
    const urut = hasil
      .map((a, i) => ({ a, i }))
      .sort((p, q) => p.a - q.a)
      .map((p) => p.i);
    const keluar = [...hasil];
    urut.forEach((indeks, posisi) => {
      keluar[indeks] = norm(pusat + ((posisi - (n - 1) / 2) * Math.PI * 2) / n);
    });
    return keluar;
  }

  /*
    Didorong sedikit LEBIH jauh daripada kekurangannya, dan diulang cukup
    banyak. Mendorong tepat sebesar kekurangannya membuat rombongan yang
    saling berdesakan mendekati jarak minimum tanpa pernah mencapainya —
    tiap putaran hanya menutup separuh sisa jaraknya.
  */
  const lebih = 1.08;
  for (let putaran = 0; putaran < 40; putaran++) {
    const urut = hasil.map((a, i) => ({ a, i })).sort((p, q) => p.a - q.a);
    let bergeser = false;

    for (let k = 0; k < urut.length; k++) {
      const kini = urut[k];
      const lanjut = urut[(k + 1) % urut.length];
      let jarak = lanjut.a - kini.a;
      if (k === urut.length - 1) jarak += Math.PI * 2;
      if (jarak >= minGap) continue;

      const dorong = ((minGap - jarak) / 2) * lebih;
      hasil[kini.i] = norm(hasil[kini.i] - dorong);
      hasil[lanjut.i] = norm(hasil[lanjut.i] + dorong);
      bergeser = true;
    }
    if (!bergeser) break;
  }

  return hasil;
}

/**
 * Kepekatan penunjuk menurut seberapa baru ia: yang paling baru paling pekat.
 *
 * Saat tiga penyerang menembak sekaligus, yang paling menentukan adalah yang
 * BARU SAJA memukul — itulah yang masih menembaki pemain detik ini.
 */
export function arrowOpacity(rank: number): number {
  const r = Number.isFinite(rank) ? Math.max(0, Math.floor(rank)) : 0;
  return Math.max(0.35, 1 - r * 0.22);
}
