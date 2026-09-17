/**
 * Apa saja yang game ini simpan di perangkat pemain, dan apakah perangkatnya
 * memang mau menyimpannya.
 *
 * Kuncinya dikumpulkan di satu berkas, bukan ditulis di masing-masing store.
 * Pertanyaan "sebenarnya apa saja yang disimpan tentang saya?" adalah
 * pertanyaan yang wajar, dan jawabannya sebaiknya bisa dibaca sekali lihat
 * alih-alih dikumpulkan dari lima berkas. Awalan yang seragam juga menjaga
 * kunci game ini tidak bertabrakan dengan kunci lain pada domain yang sama.
 */
const PREFIX = "coolmatch";

export const STORAGE_KEYS = {
  /** Nama pemain dan apakah ia sudah pernah menamai dirinya. */
  profile: `${PREFIX}:profil-pemain`,
  /** Peta yang dipilih untuk bertanding. */
  map: `${PREFIX}:peta-terpilih`,
  /** Tingkat kesulitan dan jumlah lawan. */
  matchSetup: `${PREFIX}:pengaturan-lawan`,
  /** Senjata yang dibawa bertanding. */
  loadout: `${PREFIX}:senjata-dibawa`,
  /** Suara, tampilan, dan sensitivitas. */
  settings: `${PREFIX}:pengaturan`,
  /** Tombol pilihan pemain. */
  keybinds: `${PREFIX}:tombol`,
} as const;

/**
 * Benar bila perangkat ini benar-benar mau menyimpan.
 *
 * Bukan sekadar memeriksa keberadaan `localStorage`: pada jendela penyamaran
 * dan pada peramban yang memblokir data situs, objeknya ada tetapi menulis
 * ke dalamnya melempar error. Satu-satunya cara tahu adalah mencoba menulis.
 *
 * Dipakai layar Pengaturan untuk memilih kalimat yang benar. Menjanjikan
 * "tersimpan otomatis" kepada pemain yang perangkatnya menolak menyimpan
 * adalah janji yang pasti dilanggar, dan pemain baru menyadarinya besok saat
 * semua pilihannya kembali ke bawaan.
 */
export function canPersist(): boolean {
  if (typeof window === "undefined") return false;
  const probe = `${PREFIX}:cek-simpan`;
  try {
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
