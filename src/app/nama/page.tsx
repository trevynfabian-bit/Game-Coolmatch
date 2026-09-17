import type { Metadata } from "next";
import { PlayerNameForm } from "@/components/profile/player-name-form";

export const metadata: Metadata = {
  title: "Nama Pemain — Arena Tembak Simple",
  description:
    "Tuliskan nama yang muncul di papan skor dan kill feed. Tersimpan di perangkat ini, tanpa akun.",
};

/**
 * Halaman nama pemain. Namanya masih disimpan di localStorage lewat
 * useProfileStore; saat layer backend siap, penyimpanannya tinggal diganti
 * pembaruan baris `players`.
 */
export default function PlayerNamePage() {
  return (
    <main className="min-h-dvh">
      <PlayerNameForm />
    </main>
  );
}
