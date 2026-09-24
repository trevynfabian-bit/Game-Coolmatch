import type { Metadata } from "next";
import { OpponentSettingsPage } from "@/components/settings/opponent-settings";

export const metadata: Metadata = {
  title: "Pengaturan Lawan — Arena Tembak Simple",
  description: "Tingkat kesulitan dan jumlah musuh otomatis.",
};

export default function OpponentSettingsRoute() {
  return (
    <main className="min-h-dvh">
      <OpponentSettingsPage />
    </main>
  );
}
