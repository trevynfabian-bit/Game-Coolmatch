import type { Metadata } from "next";
import { ArenaExperience } from "@/components/arena/arena-experience";

export const metadata: Metadata = {
  title: "Arena — Arena Tembak Simple",
  description:
    "Arena deathmatch 3D tempat pemain bertarung melawan musuh otomatis sampai batas skor tercapai.",
};

/**
 * Halaman arena pertandingan. Pertandingannya disusun di sisi klien dari
 * senjata dan pengaturan lawan yang dipilih pemain; ketika layer backend siap,
 * penyusunan itu diganti pengambilan data pertandingan dari server.
 */
export default function ArenaPage() {
  return (
    <main className="h-dvh w-full">
      <ArenaExperience />
    </main>
  );
}
