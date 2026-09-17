import { StatTile } from "@/components/scoreboard/stat-tile";
import { progressFacts, type PlayerProgress } from "@/lib/game/collection";

/**
 * Ringkasan kemajuan bermain dalam bentuk ubin angka.
 *
 * Tingkat kemenangan dan rata-rata kill per pertandingan tidak diminta sebagai
 * prop, melainkan diturunkan dari tiga angka mentahnya. Meminta keduanya
 * sebagai prop berarti tiap pemanggil menghitung sendiri, dan cepat atau
 * lambat dua layar akan menampilkan persentase yang berbeda untuk pemain yang
 * sama.
 */
export function ProgressSummary({ progress }: { progress: PlayerProgress }) {
  const facts = progressFacts(progress);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Pertandingan" value={facts.matchesPlayed} />
        <StatTile label="Menang" value={facts.wins} accent="text-emerald-300" />
        <StatTile
          label="Tingkat menang"
          value={`${facts.winRate}%`}
          accent="text-amber-300"
        />
        <StatTile
          label="Total kill"
          value={facts.totalKills}
          accent="text-sky-300"
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Rata-rata{" "}
        <span className="font-mono text-slate-400">{facts.killsPerMatch}</span>{" "}
        kill per pertandingan.
      </p>
    </>
  );
}

/**
 * Kemajuan yang sama dalam SATU baris, untuk tempat yang tidak punya ruang
 * empat ubin — menu utama, misalnya.
 *
 * Sengaja membaca `progressFacts` yang sama dengan bentuk ubinnya. Dua bentuk
 * tampilan boleh berbeda; angka yang mereka bacakan tidak boleh.
 */
export function ProgressLine({ progress }: { progress: PlayerProgress }) {
  const facts = progressFacts(progress);

  return (
    <span className="text-[11px] text-slate-400">
      <span className="font-mono text-slate-200 tabular-nums">
        {facts.matchesPlayed}
      </span>{" "}
      pertandingan
      <span className="text-slate-700"> · </span>
      <span className="font-mono text-emerald-300 tabular-nums">
        {facts.wins}
      </span>{" "}
      menang ({facts.winRate}%)
      <span className="text-slate-700"> · </span>
      <span className="font-mono text-sky-300 tabular-nums">
        {facts.totalKills}
      </span>{" "}
      kill
    </span>
  );
}
