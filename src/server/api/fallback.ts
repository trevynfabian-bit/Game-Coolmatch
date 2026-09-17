import { jsonError } from "@/server/api/json";

/**
 * Menjalankan pembacaan, dan menyerah ke nilai cadangan bila ia gagal.
 *
 * Dipakai hanya untuk MEMBACA. Berkas database bisa hilang, rusak, atau
 * terkunci proses lain, dan kalau itu terjadi pemain lebih baik mendapat nilai
 * bawaan daripada halaman yang tidak mau terbuka sama sekali — nama bawaan
 * masih bisa dipakai bertanding, sedangkan galat tidak bisa dipakai apa pun.
 *
 * Kegagalannya TIDAK ditelan diam-diam: ia dicatat ke log server, dan
 * pemanggilnya menandai jawabannya sebagai `degraded` supaya layar bisa
 * mengatakan bahwa yang ditampilkan adalah bawaan, bukan pilihan pemain.
 * Cadangan yang diam adalah cara paling rapi menyembunyikan database rusak
 * selama berminggu-minggu.
 */
export function readOr<T>(label: string, read: () => T, fallback: T): T {
  try {
    return read();
  } catch (error) {
    console.error(`[${label}] gagal dibaca, memakai nilai cadangan:`, error);
    return fallback;
  }
}

/**
 * Menjalankan penulisan, dan mengubah kegagalannya jadi jawaban yang terbaca.
 *
 * Tidak ada nilai cadangan di sini, dan itu disengaja. Membaca boleh menyerah
 * ke bawaan karena bawaan masih berguna; menulis tidak — berpura-pura sebuah
 * penyimpanan berhasil padahal tidak adalah kebohongan yang baru ketahuan
 * ketika pemain kembali dan pilihannya raib.
 *
 * 503, bukan 500: penyebabnya penyimpanan yang sedang tidak bisa ditulis, dan
 * itu keadaan yang bisa pulih — bukan permintaan yang salah, dan bukan pula
 * kerusakan yang pasti menetap.
 */
export function guardWrite(label: string, write: () => Response): Response {
  try {
    return write();
  } catch (error) {
    console.error(`[${label}] gagal disimpan:`, error);
    return jsonError(
      503,
      "Penyimpanan sedang tidak bisa diakses. Coba lagi sebentar lagi.",
    );
  }
}
