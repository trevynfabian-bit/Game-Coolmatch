import type { Metadata } from "next";
import { StandingsPage } from "@/components/history/standings-page";

export const metadata: Metadata = {
  title: "Klasemen — Arena Tembak Simple",
  description: "Peringkat gabungan kamu dan para bot dari seluruh pertandingan.",
};

export default function StandingsRoute() {
  return (
    <main className="min-h-dvh">
      <StandingsPage />
    </main>
  );
}
