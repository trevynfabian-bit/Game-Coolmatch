import type { UnlockFacts } from "@/lib/game/unlock";

/**
 * Batang kemajuan menuju terbukanya sebuah senjata.
 *
 * Dipisah sendiri karena dipakai di tiga tempat dengan bingkai berbeda —
 * keterangan syarat pada daftar senjata, panel sasaran terdekat di halaman
 * Koleksi, dan baris rapat di menu utama — sementara aturannya harus sama di
 * ketiganya: sumber angka yang sama, lebar minimum yang sama, dan penanda
 * progressbar yang sama untuk pembaca layar.
 */
export function UnlockBar({
  facts,
  label,
  className = "w-32",
}: {
  facts: UnlockFacts;
  /** Keterangan untuk pembaca layar; bawaannya kalimat syaratnya sendiri. */
  label?: string;
  /** Kelas lebar batangnya; daftar yang sempit memakai batang lebih pendek. */
  className?: string;
}) {
  return (
    <span
      className={`h-1 overflow-hidden rounded-full bg-white/10 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(facts.progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? facts.label}
    >
      <span
        className="block h-full rounded-full bg-amber-400/70"
        // Lebar minimum dua persen supaya kemajuan yang baru sedikit tetap
        // terlihat sebagai garis, bukan batang yang seolah kosong sama sekali.
        style={{ width: `${Math.max(2, facts.progress * 100)}%` }}
      />
    </span>
  );
}
