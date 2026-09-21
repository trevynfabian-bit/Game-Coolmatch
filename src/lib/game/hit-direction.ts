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
