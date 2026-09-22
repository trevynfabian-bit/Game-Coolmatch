import {
  COIN_REASON_INFO,
  formatCoins,
  isIncome,
  signedCoins,
  type LedgerRow,
} from "@/lib/game/wallet";
import { formatMatchTime } from "@/lib/game/scoreboard";

/**
 * Satu baris riwayat koin.
 *
 * Tiga hal ditampilkan sekaligus, dan ketiganya menjawab pertanyaan yang
 * berbeda: sebabnya ("dari mana koin ini"), jumlahnya ("berapa"), dan saldo
 * sesudahnya ("jadi berapa saldoku waktu itu"). Yang terakhir itu yang
 * membuat daftar ini benar-benar menjelaskan saldo di kepala halaman alih-alih
 * sekadar mendaftar kejadian.
 *
 * Arah koin ditandai dua kali dengan sengaja: lewat tanda plus/minus dan lewat
 * warna. Warna saja hilang bagi pemain yang tidak bisa membedakannya, dan
 * tanda saja mudah terlewat saat mata menyapu daftar panjang.
 */
export function CoinEntryRow({ row }: { row: LedgerRow }) {
  const info = COIN_REASON_INFO[row.reason];
  const masuk = isIncome(row);

  return (
    <li className="flex items-start justify-between gap-3 border-b border-white/5 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-200">{info.label}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {row.note ?? info.hint}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`font-mono text-sm font-semibold tabular-nums ${
            masuk ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {signedCoins(row.amount)}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-slate-500 tabular-nums">
          <span className="sr-only">Saldo sesudahnya </span>
          {formatCoins(row.balanceAfter)}
          <span className="text-slate-700"> · </span>
          {formatMatchTime(row.at).split(", ").at(-1)}
        </p>
      </div>
    </li>
  );
}
