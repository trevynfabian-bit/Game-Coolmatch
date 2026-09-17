/**
 * Satu angka besar berlabel, dipakai untuk membacakan perolehan pemain secara
 * sekilas — ronde, kill, mati, rasio, dan skor — sebelum ia menelusuri tabel
 * lengkapnya.
 *
 * Dipakai bersama oleh ringkasan akhir di arena dan rincian di halaman skor
 * supaya keduanya membaca angka yang sama dengan bentuk yang sama.
 */
export function StatTile({
  label,
  value,
  accent = "text-slate-100",
}: {
  label: string;
  value: string | number;
  /** Kelas warna angkanya; bawaannya putih keabuan. */
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2.5">
      <p className="text-[9px] tracking-[0.15em] text-slate-500 uppercase">
        {label}
      </p>
      <p className={`mt-1 font-mono text-xl font-bold tabular-nums ${accent}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * Lima ubin perolehan seorang peserta dalam satu pertandingan. Urutannya sama
 * dengan urutan kolom pada tabel papan skor, jadi mata tidak perlu memetakan
 * ulang saat berpindah dari ringkasan ke klasemen.
 */
export function PlayerStatTiles({
  roundWins,
  kills,
  deaths,
  ratio,
  score,
}: {
  roundWins: number;
  kills: number;
  deaths: number;
  ratio: string;
  score: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <StatTile label="Ronde" value={roundWins} accent="text-amber-300" />
      <StatTile label="Kill" value={kills} />
      <StatTile label="Mati" value={deaths} accent="text-slate-400" />
      <StatTile label="K/M" value={ratio} />
      <StatTile label="Skor" value={score} accent="text-sky-300" />
    </div>
  );
}
