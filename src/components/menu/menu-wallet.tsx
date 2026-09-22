import Link from "next/link";
import { CoinChip } from "@/components/wallet/coin-balance";
import { walletSummary } from "@/lib/game/wallet";
import { MOCK_COIN_BALANCE, MOCK_COIN_ENTRIES } from "@/lib/mock/wallet";

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
 * Sama seperti kartu progres, bagian ini belum perlu berjalan di browser —
 * sumbernya masih data tiruan yang sama untuk semua orang, jadi hasil
 * prerender dan hasil hidrasi pasti sama.
 */
export function MenuWallet() {
  const summary = walletSummary(MOCK_COIN_ENTRIES);

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
      <CoinChip balance={MOCK_COIN_BALANCE} />
    </Link>
  );
}
