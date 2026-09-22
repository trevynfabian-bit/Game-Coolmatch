import { formatCoins } from "@/lib/game/wallet";

/**
 * Saldo koin sebagai angka besar.
 *
 * Satu-satunya bentuk yang dipakai di mana pun saldo perlu tampil besar, dan
 * angkanya selalu datang dari luar sebagai hasil penjumlahan riwayat — bukan
 * dihitung ulang di sini. Komponen tampilan yang ikut menghitung berarti ada
 * satu tempat lagi yang bisa salah menjumlah.
 */
export function CoinBalance({
  balance,
  hint,
}: {
  balance: number;
  /** Kalimat pendek di bawah angkanya, misalnya kapan terakhir berubah. */
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-5 py-4">
      <p className="text-[10px] tracking-[0.25em] text-amber-300/80 uppercase">
        Saldo koin
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <CoinMark />
        <span className="font-mono text-4xl font-bold tabular-nums text-amber-200">
          {formatCoins(balance)}
        </span>
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Saldo yang sama dalam SATU baris kecil, untuk tempat yang tidak punya ruang
 * — menu utama dan HUD arena nanti.
 *
 * Sengaja membaca `formatCoins` yang sama dengan bentuk besarnya. Dua bentuk
 * tampilan boleh berbeda; angka yang mereka bacakan tidak boleh.
 */
export function CoinChip({ balance }: { balance: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1">
      <CoinMark small />
      <span className="font-mono text-xs font-semibold tabular-nums text-amber-200">
        {formatCoins(balance)}
      </span>
    </span>
  );
}

/**
 * Penanda koin: lingkaran kecil bertuliskan K.
 *
 * Digambar, bukan diambil dari berkas ikon, dengan alasan yang sama seperti
 * tekstur arena dan bunyi tembakan — permainan ini tidak mengunduh aset.
 */
function CoinMark({ small = false }: { small?: boolean }) {
  const ukuran = small ? "h-3.5 w-3.5 text-[8px]" : "h-6 w-6 text-[11px]";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-amber-400/90 font-bold text-amber-950 ${ukuran}`}
    >
      K
    </span>
  );
}
