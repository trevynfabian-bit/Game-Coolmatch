import type { Metadata } from "next";
import { MatchHistoryPage } from "@/components/history/match-history-page";

export const metadata: Metadata = {
  title: "Riwayat Pertandingan — Arena Tembak Simple",
  description: "Pertandingan lampau beserta hasil, perolehan, dan koin.",
};

export default function MatchHistoryRoute() {
  return (
    <main className="min-h-dvh">
      <MatchHistoryPage />
    </main>
  );
}
