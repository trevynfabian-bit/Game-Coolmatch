import { CoinChip } from "@/components/wallet/coin-balance";
import { formatCoins, signedCoins } from "@/lib/game/wallet";
import {
  performanceSentence,
  type CoinRewardLine,
  type MatchCoinReward,
} from "@/lib/game/coin-reward";

/**
 * Perolehan koin sebuah pertandingan, dirinci baris demi baris.
 *
 * Rinciannya DIBAGI DUA: koin yang datang sekadar karena pertandingannya
 * selesai, dan koin yang datang dari cara pemain bermain. Daftar rata berisi
 * lima baris hanya memberi tahu pemain bahwa ia dapat sekian; daftar yang
 * terbagi memberi tahu bahwa sebagian besar koinnya datang karena ia
 * menumbangkan banyak lawan — dan itu yang membuat pertandingan berikutnya
 * terasa layak diperjuangkan alih-alih sekadar diselesaikan.
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

  const dasar = reward.lines.filter((line) => line.group === "dasar");
  const performa = reward.lines.filter((line) => line.group === "performa");
  const kalimat = performanceSentence(reward);

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
        {dasar.map((line) => (
          <RewardLine key={line.reason} line={line} />
        ))}
      </ul>

      {performa.length > 0 ? (
        <div className="mt-2 border-t border-amber-400/10 pt-2">
          {/*
            Subtotalnya berdiri di kepala kelompok, bukan di kakinya. Pemain
            membaca dari atas: yang ingin ia tahu lebih dulu adalah berapa
            besar bagian ini, baru dari mana saja datangnya.
          */}
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[9px] tracking-[0.15em] text-emerald-300/80 uppercase">
              Bonus performa
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-emerald-300">
              {signedCoins(reward.performanceTotal)}
            </p>
          </div>
          <ul className="mt-1">
            {performa.map((line) => (
              <RewardLine key={line.reason} line={line} />
            ))}
          </ul>
        </div>
      ) : null}

      {kalimat ? (
        <p className="mt-2 border-t border-amber-400/10 pt-2 text-[11px] leading-relaxed text-slate-400">
          {kalimat}
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-amber-400/10 pt-2">
        <span className="text-[10px] text-slate-400">
          Saldo {formatCoins(balanceBefore)} menjadi
        </span>
        <CoinChip balance={balanceBefore + reward.total} />
      </div>
    </div>
  );
}

/** Satu baris perolehan: apa, dihitung dari apa, dan berapa. */
function RewardLine({ line }: { line: CoinRewardLine }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-1">
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
  );
}
