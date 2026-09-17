import { unlockFacts, type UnlockRequirement } from "@/lib/game/unlock";

/**
 * Keterangan syarat membuka sebuah senjata: apa yang harus dikumpulkan,
 * sejauh mana kemajuannya, dan berapa lagi sisanya.
 *
 * Satu komponen untuk semua tempat yang menampilkannya — daftar Pilih Senjata
 * dan halaman Koleksi. Sebelumnya keduanya punya markup sendiri untuk hal yang
 * sama persis, sehingga memperbaiki keterangan di satu layar meninggalkan layar
 * lain apa adanya.
 *
 * Sisa yang dibutuhkan disebut dalam kalimat, bukan hanya "2 / 5". Angka
 * pecahan memaksa pemain mengurangi sendiri, dan pada daftar berisi beberapa
 * senjata pengurangan itu berulang di tiap baris.
 */
export function UnlockRequirementNote({
  requirement,
  className = "",
  barWidth = "w-32",
}: {
  requirement: UnlockRequirement;
  className?: string;
  /** Lebar bar kemajuan; daftar yang sempit memakai bar yang lebih pendek. */
  barWidth?: string;
}) {
  const facts = unlockFacts(requirement);

  return (
    <span className={`block ${className}`}>
      <span className="block text-[11px] text-amber-300/80">{facts.label}</span>

      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`h-1 overflow-hidden rounded-full bg-white/10 ${barWidth}`}
          role="progressbar"
          aria-valuenow={Math.round(facts.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={facts.label}
        >
          <span
            className="block h-full rounded-full bg-amber-400/70"
            // Lebar minimum dua persen supaya kemajuan yang baru sedikit tetap
            // terlihat sebagai garis, bukan bar yang seolah kosong sama sekali.
            style={{ width: `${Math.max(2, facts.progress * 100)}%` }}
          />
        </span>

        <span className="font-mono text-[10px] text-slate-500 tabular-nums">
          {facts.countText}
        </span>
        <span className="text-[10px] text-amber-200/70">
          {facts.remainingText}
        </span>
      </span>
    </span>
  );
}
