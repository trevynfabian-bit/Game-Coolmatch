/**
 * Penanda bahwa arena yang sedang dimainkan adalah uji coba senjata.
 *
 * Tanpa penanda ini pemain melihat pertandingan satu ronde berbatas tujuh kill
 * dan tidak punya cara tahu kenapa aturannya berbeda — ia akan mengira
 * pertandingannya rusak atau pengaturannya berubah sendiri. Nama senjatanya
 * ikut disebut karena itulah alasan ia ada di sini.
 */
export function TrialBadge({ weaponName }: { weaponName: string }) {
  return (
    <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 backdrop-blur-sm">
        <span className="text-[10px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
          Uji coba
        </span>
        <span className="text-[11px] text-amber-100/80">{weaponName}</span>
      </div>
    </div>
  );
}
