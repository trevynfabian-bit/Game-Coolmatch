import { CoinChip } from "@/components/wallet/coin-balance";
import { MOCK_COIN_BALANCE } from "@/lib/mock/wallet";

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
 */
export function CoinCounter() {
  return (
    <div className="pointer-events-none absolute right-4 bottom-[9.5rem] sm:right-5 sm:bottom-[11.5rem]">
      <CoinChip balance={MOCK_COIN_BALANCE} />
    </div>
  );
}
