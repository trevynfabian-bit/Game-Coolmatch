"use client";

import Link from "next/link";
import { CoinChip } from "@/components/wallet/coin-balance";
import { walletSummary } from "@/lib/game/wallet";
import { useCoinBalance, useCoinEntries } from "@/lib/store/wallet-store";

/**
 * Saldo koin di kaki menu utama.
 *
 * Ekonomi hanya berarti bila pemain TAHU ia punya sesuatu untuk dibelanjakan.
 * Saldo yang hanya ada di halaman dompet harus dicari sendiri, dan pemain yang
 * tidak pernah membukanya tidak akan pernah tahu koinnya sudah cukup untuk
 * apa pun. Di sini ia muncul tepat sebelum pemain memilih mau ke mana.
 *
 * Seluruh kartunya satu tautan menuju dompet, sama seperti kartu progres di
 * sebelahnya: angka yang menimbulkan pertanyaan sebaiknya berdiri tepat di
 * atas jawabannya.
 *
 * Angkanya harus HIDUP, dan itu sebabnya bagian ini berjalan di browser:
 * pemain yang baru saja menyelesaikan pertandingan lalu kembali ke menu harus
 * melihat saldo yang sudah bertambah. Saldo yang kembali ke angka lama begitu
 * ia keluar dari arena terbaca sebagai koin yang hilang.
 *
 * Hidrasinya tetap aman tanpa penanda apa pun: perolehan sesi mulai dari
 * kosong baik di server maupun di browser, jadi render pertama keduanya sama
 * persis. Angkanya baru berubah sesudah sebuah pertandingan usai, dan pada
 * saat itu tidak ada lagi hasil render server yang perlu dicocokkan.
 */
export function MenuWallet() {
  const entries = useCoinEntries();
  const summary = walletSummary(entries);
  const balance = useCoinBalance();

  return (
    <Link
      href="/dompet"
      className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3 transition-colors hover:border-amber-400/30 hover:bg-slate-900/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
    >
      <span>
        <span className="block text-[9px] tracking-[0.2em] text-slate-500 uppercase">
          Dompet
        </span>
        {/*
          Yang disebut di sampingnya adalah total pemasukan, bukan jumlah
          transaksi. "Sudah mengumpulkan 1.515 koin" menjelaskan kenapa
          saldonya sebesar itu; "14 transaksi" hanya menghitung baris.
        */}
        <span className="mt-1 block text-[11px] text-slate-400">
          Terkumpul{" "}
          <span className="font-mono text-slate-200 tabular-nums">
            {summary.earned.toLocaleString("id-ID")}
          </span>{" "}
          koin sejauh ini
        </span>
      </span>
      <CoinChip balance={balance} />
    </Link>
  );
}
