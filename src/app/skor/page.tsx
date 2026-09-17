import type { Metadata } from "next";
import { ScoreboardScreen } from "@/components/scoreboard/scoreboard-screen";

export const metadata: Metadata = {
  title: "Skor Pertandingan — Arena Tembak Simple",
  description:
    "Hasil akhir tiap pertandingan: juara, kemenangan ronde, kill, dan skor seluruh peserta.",
};

/**
 * Halaman skor pertandingan. Riwayatnya masih dari data tiruan; saat layer
 * backend siap, sumbernya tinggal diganti hasil pengambilan tabel `matches`
 * beserta `match_scores` miliknya.
 */
export default function ScoresPage() {
  return (
    <main className="min-h-dvh">
      <ScoreboardScreen />
    </main>
  );
}
