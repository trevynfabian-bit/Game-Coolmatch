import type { Metadata } from "next";
import { TrialMenu } from "@/components/trial/trial-menu";

export const metadata: Metadata = {
  title: "Uji Coba Senjata — Arena Tembak Simple",
  description: "Simulasi kilat untuk mencoba senjata apa pun tanpa memengaruhi statistik, pembukaan senjata, maupun koin.",
};

export default function TrialPage() {
  return (
    <main className="min-h-dvh">
      <TrialMenu />
    </main>
  );
}
