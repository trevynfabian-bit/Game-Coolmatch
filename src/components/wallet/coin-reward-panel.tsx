import { CoinChip } from "@/components/wallet/coin-balance";
import { formatCoins, signedCoins } from "@/lib/game/wallet";
import type { MatchCoinReward } from "@/lib/game/coin-reward";

/**
 * Perolehan koin sebuah pertandingan, dirinci baris demi baris.
 *
 * Totalnya berdiri paling besar karena itu yang pertama dicari pemain, tetapi
 * rinciannya yang membuat layar ini berguna: pemain yang melihat "Bonus ronde
 * 90" tahu bahwa memenangkan ronde memang dibayar, dan itulah yang membuat
 * ronde berikutnya terasa layak diperjuangkan. Total tanpa rincian hanya
 * angka yang harus dipercaya.
 *
 * Saldo sesudahnya ikut disebutkan supaya perolehan ini tersambung ke angka
 * yang sama dengan yang dibaca pemain di menu dan di dompet — bukan angka
 * yang berdiri sendiri lalu hilang begitu layar ditutup.
 */
export function CoinRewardPanel({
  reward,
  balanceBefore,
}: {
  reward: MatchCoinReward;
  /** Saldo sebelum pertandingan ini; totalnya ditambahkan di atasnya. */
  balanceBefore: number;
}) {
  if (reward.lines.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[9px] tracking-[0.15em] text-amber-300/80 uppercase">
          Koin diperoleh
        </p>
        <p className="font-mono text-2xl font-bold tabular-nums text-amber-200">
          {signedCoins(reward.total)}
        </p>
      </div>

      <ul className="mt-2 border-t border-amber-400/10 pt-2">
        {reward.lines.map((line) => (
          <li
            key={line.reason}
            className="flex items-baseline justify-between gap-3 py-1"
          >
            <span className="min-w-0">
              <span className="block truncate text-xs text-slate-200">
                {line.label}
              </span>
              <span className="block truncate text-[10px] text-slate-500">
                {line.detail}
              </span>
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-emerald-300">
              {signedCoins(line.amount)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-amber-400/10 pt-2">
        <span className="text-[10px] text-slate-400">
          Saldo {formatCoins(balanceBefore)} menjadi
        </span>
        <CoinChip balance={balanceBefore + reward.total} />
      </div>
    </div>
  );
}
