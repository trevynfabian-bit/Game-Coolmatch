/**
 * Aturan nama pemain.
 *
 * Dipisah dari layarnya karena bukan hanya form yang perlu tahu: papan skor,
 * kill feed, dan nanti baris `players` di server semuanya memegang nama yang
 * sama. Satu tempat memutuskan mana yang sah, sehingga nama yang lolos di form
 * tidak bisa jadi nama yang merusak tampilan di tempat lain.
 *
 * Murni dan tanpa efek samping: tidak membaca jam, tidak menyentuh
 * penyimpanan, tidak mengambil apa pun dari luar.
 */

/** Nama bawaan sebelum pemain menuliskan namanya sendiri. */
export const DEFAULT_PLAYER_NAME = "Kamu";

/**
 * Batas panjang nama.
 *
 * Bukan angka sembarangan: papan skor dan kill feed menaruh nama di kolom
 * sempit bersama angka kill dan mati. Nama yang lebih panjang dari ini akan
 * terpotong di tengah pertandingan — lebih baik ditolak saat diketik, ketika
 * pemain masih bisa memilih yang lain.
 */
export const PLAYER_NAME_MIN = 2;
export const PLAYER_NAME_MAX = 16;

/**
 * Huruf, angka, spasi, dan tiga tanda yang lazim dipakai nama pemain.
 *
 * Sengaja tidak melarang huruf beraksen atau huruf non-Latin — pemain berhak
 * memakai namanya sendiri. Yang ditolak adalah yang merusak tampilan: tanda
 * baca berat, lambang, dan emoji yang lebarnya tidak bisa ditebak kolom sempit
 * papan skor.
 */
const ALLOWED = /^[\p{L}\p{N} _.-]+$/u;

/**
 * Rapikan nama sebelum disimpan atau diperiksa.
 *
 * Spasi di ujung dibuang dan spasi beruntun di tengah dijadikan satu. Tanpa
 * ini, "Rio    Ganteng" dan "Rio Ganteng" jadi dua nama berbeda yang terlihat
 * sama persis di layar.
 */
export function normalizePlayerName(raw: string): string {
  return raw.trim().replace(/\s+/gu, " ");
}

/** Alasan sebuah nama ditolak. Kode, bukan kalimat — kata-katanya milik layar. */
export type PlayerNameProblem =
  | "kosong"
  | "terlalu-pendek"
  | "terlalu-panjang"
  | "karakter-terlarang"
  | "tanpa-huruf"
  | "sudah-dipakai";

/**
 * Periksa nama, kembalikan alasan pertama yang menggagalkannya.
 *
 * Diperiksa atas nama yang SUDAH dirapikan, supaya spasi di ujung tidak
 * diam-diam ikut dihitung sebagai panjang nama.
 *
 * `takenNames` berisi nama yang sudah dipakai peserta lain — lawan otomatis
 * yang bisa muncul di arena. Dioper, bukan diimpor: aturan nama tidak punya
 * urusan dengan daftar bot, dan mengikatnya ke sana berarti aturan ini ikut
 * berubah setiap kali ada bot baru.
 */
export function checkPlayerName(
  raw: string,
  takenNames: readonly string[] = [],
): PlayerNameProblem | undefined {
  const name = normalizePlayerName(raw);

  if (name === "") return "kosong";
  // Panjang dihitung per karakter tampak, bukan per unit UTF-16: tanpa ini
  // nama beremoji atau beraksen dihitung dua kali panjangnya.
  const length = [...name].length;
  if (length < PLAYER_NAME_MIN) return "terlalu-pendek";
  if (length > PLAYER_NAME_MAX) return "terlalu-panjang";
  if (!ALLOWED.test(name)) return "karakter-terlarang";

  // "..." dan "---" lolos pemeriksaan di atas: panjangnya cukup dan setiap
  // tandanya diizinkan. Sebuah nama tetap harus bisa dibaca sebagai nama.
  if (!/[\p{L}\p{N}]/u.test(name)) return "tanpa-huruf";

  // Perbandingan mengabaikan besar-kecil huruf: "bot ayu" dan "Bot Ayu"
  // terbaca sebagai peserta yang sama di papan skor sesempit itu.
  const lowered = name.toLocaleLowerCase();
  if (takenNames.some((taken) => taken.toLocaleLowerCase() === lowered)) {
    return "sudah-dipakai";
  }

  return undefined;
}

export function isValidPlayerName(
  raw: string,
  takenNames: readonly string[] = [],
): boolean {
  return checkPlayerName(raw, takenNames) === undefined;
}

/** Panjang nama seperti yang dihitung `checkPlayerName`, untuk penghitung karakter. */
export function playerNameLength(raw: string): number {
  return [...normalizePlayerName(raw)].length;
}
