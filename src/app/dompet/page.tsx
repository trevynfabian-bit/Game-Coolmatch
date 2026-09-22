import type { Metadata } from "next";
import { WalletScreen } from "@/components/wallet/wallet-screen";

export const metadata: Metadata = {
  title: "Dompet Koin — Arena Tembak Simple",
  description:
    "Lihat saldo koinmu dan tiap koin yang masuk maupun keluar dari hasil bertanding.",
};

/**
 * Halaman dompet koin. Riwayatnya masih dari data tiruan; saat layer backend
 * siap, sumbernya diganti tabel transaksi koin — saldonya tetap dijumlahkan
 * dari riwayat itu, bukan dibaca sebagai angka tersendiri.
 *
 * Tetap komponen server: halaman ini hanya membaca dan menampilkan, tidak ada
 * satu pun bagiannya yang butuh berjalan di browser.
 */
export default function WalletPage() {
  return (
    <main className="min-h-dvh">
      <WalletScreen />
    </main>
  );
}
