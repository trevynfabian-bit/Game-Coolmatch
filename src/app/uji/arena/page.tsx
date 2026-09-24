import type { Metadata } from "next";
import { ArenaExperience } from "@/components/arena/arena-experience";

export const metadata: Metadata = {
  title: "Arena Uji Coba — Arena Tembak Simple",
  description: "Simulasi kilat satu ronde untuk mencoba senjata tanpa memengaruhi progres.",
};

/** Arena uji coba: arena yang sama dengan pertandingan, dalam mode uji coba. */
export default function TrialArenaPage() {
  return (
    <main className="h-dvh w-full">
      <ArenaExperience trial />
    </main>
  );
}
