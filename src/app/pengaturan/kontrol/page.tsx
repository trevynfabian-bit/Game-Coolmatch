import type { Metadata } from "next";
import { ControlSettingsPage } from "@/components/settings/control-settings";

export const metadata: Metadata = {
  title: "Pengaturan Kontrol — Arena Tembak Simple",
  description: "Sensitivitas mouse untuk mengarahkan pandangan di arena.",
};

export default function ControlSettingsRoute() {
  return (
    <main className="min-h-dvh">
      <ControlSettingsPage />
    </main>
  );
}
