import type { Metadata } from "next";
import { ArenaExperience } from "@/components/arena/arena-experience";
import { MOCK_MATCH } from "@/lib/mock/match";

export const metadata: Metadata = {
  title: "Arena — Arena Tembak Simple",
  description:
    "Arena deathmatch 3D tempat pemain bertarung melawan musuh otomatis sampai batas skor tercapai.",
};

/**
 * Halaman arena pertandingan. Untuk sekarang seluruh isinya digambar dari
 * potret pertandingan tiruan; ketika layer backend siap, `MOCK_MATCH` diganti
 * hasil pengambilan data pertandingan dari server.
 */
export default function ArenaPage() {
  return (
    <main className="h-dvh w-full">
      <ArenaExperience match={MOCK_MATCH} />
    </main>
  );
}
