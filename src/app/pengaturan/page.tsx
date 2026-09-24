import type { Metadata } from "next";
import { SettingsOverview } from "@/components/settings/settings-overview";

export const metadata: Metadata = {
  title: "Pengaturan — Arena Tembak Simple",
  description: "Audio, grafis, kontrol, profil, dan pilihan pertandingan.",
};

export default function SettingsRoute() {
  return (
    <main className="min-h-dvh">
      <SettingsOverview />
    </main>
  );
}
