import type { Metadata } from "next";
import { AudioSettingsPage } from "@/components/settings/audio-settings";

export const metadata: Metadata = {
  title: "Pengaturan Audio — Arena Tembak Simple",
  description: "Atur volume utama, efek suara, musik, dan antarmuka.",
};

export default function AudioSettingsRoute() {
  return (
    <main className="min-h-dvh">
      <AudioSettingsPage />
    </main>
  );
}
