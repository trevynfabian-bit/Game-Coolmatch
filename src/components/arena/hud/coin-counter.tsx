"use client";

import { CoinChip } from "@/components/wallet/coin-balance";
import { useCoinBalance } from "@/lib/store/wallet-store";

/**
 * Saldo koin di arena.
 *
 * Ditaruh tepat di ATAS panel amunisi, bukan di salah satu sudut yang masih
 * kosong. Sudut kiri atas dan kanan atas sudah dipegang skor langsung dan
 * kill feed, dan keduanya tumbuh ke bawah seiring pertandingan berjalan —
 * apa pun yang dititipkan di sana cepat atau lambat akan tertimpa. Di atas
 * panel amunisi tempatnya tetap sepanjang pertandingan.
 *
 * Angkanya sengaja kecil dan tanpa label. Saldo bukan kabar yang harus dibaca
 * pemain saat sedang membidik; ia ada supaya pemain yang baru saja
 * memenangkan ronde tahu koinnya bertambah tanpa harus keluar dari arena.
 *
 * Angkanya hidup: begitu satu pertandingan selesai dan koinnya masuk, angka
 * di sini ikut naik — termasuk saat pemain langsung menekan "Main lagi" tanpa
 * pernah mampir ke menu. Saldo yang membeku di arena mengajari pemain bahwa
 * angka itu tidak perlu diperhatikan.
 */
export function CoinCounter() {
  const balance = useCoinBalance();

  return (
    <div className="pointer-events-none absolute right-4 bottom-[9.5rem] sm:right-5 sm:bottom-[11.5rem]">
      <CoinChip balance={balance} />
    </div>
  );
}
