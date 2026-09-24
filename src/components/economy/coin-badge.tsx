/** Ikon koin kecil, digambar dengan SVG supaya tanpa aset eksternal. */
export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <circle cx="8" cy="8" r="7" fill="#f59e0b" />
      <circle cx="8" cy="8" r="5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
      <path d="M8 5v6M6.2 6.6h3.1a1 1 0 0 1 0 2H6.7a1 1 0 0 0 0 2h3.1" stroke="#92400e" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Angka koin dengan pemisah ribuan gaya Indonesia. */
export function formatCoins(amount: number): string {
  return amount.toLocaleString("id-ID");
}

/** Lencana saldo koin untuk kepala halaman dan menu. */
export function CoinBadge({
  balance,
  degraded = false,
  className = "",
}: {
  balance: number;
  /** Tandai angka yang belum pasti karena server gagal dibaca. */
  degraded?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-sm font-semibold text-amber-200 tabular-nums ${className}`}
      title={degraded ? "Saldo belum bisa dipastikan dari server" : "Saldo koin"}
    >
      <CoinIcon className="h-4 w-4" />
      {formatCoins(balance)}
      {degraded ? <span className="text-[10px] text-amber-400/70">?</span> : null}
      <span className="sr-only"> koin</span>
    </span>
  );
}
