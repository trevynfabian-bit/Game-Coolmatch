import type { Metadata } from "next";
import { MatchDetailPage } from "@/components/history/match-detail-page";

export const metadata: Metadata = {
  title: "Rincian Pertandingan — Arena Tembak Simple",
  description: "Hasil, klasemen akhir, dan jalannya pertandingan per ronde.",
};

export default async function MatchDetailRoute({ params }: PageProps<"/riwayat/pertandingan/[id]">) {
  const { id } = await params;
  return (
    <main className="min-h-dvh">
      <MatchDetailPage matchId={Number(id)} />
    </main>
  );
}
