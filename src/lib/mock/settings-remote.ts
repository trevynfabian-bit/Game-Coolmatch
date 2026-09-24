/**
 * Penyimpan pengaturan ke server versi tiruan untuk fase frontend. Lapisan
 * backend menggantinya dengan panggilan ke /api/pengaturan; bentuk hasilnya
 * sama supaya pemanggil tidak berubah.
 *
 * Di mode pengembangan kegagalan bisa dipaksa lewat
 * `window.__gagalSimpanPengaturan = true` untuk menguji notifikasi gagal simpan.
 */
export type RemoteSaveResult = { ok: true; savedAt: number } | { ok: false; message: string };

export async function saveSettingsRemote(payload: unknown): Promise<RemoteSaveResult> {
  void payload;
  await new Promise((resolve) => setTimeout(resolve, 250));
  const forceFail =
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    (window as unknown as { __gagalSimpanPengaturan?: boolean }).__gagalSimpanPengaturan === true;
  if (forceFail) return { ok: false, message: "server tidak menjawab" };
  return { ok: true, savedAt: Date.now() };
}
