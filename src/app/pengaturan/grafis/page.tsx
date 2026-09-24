import type { Metadata } from "next";
import { GraphicsSettingsPage } from "@/components/settings/graphics-settings";

export const metadata: Metadata = {
  title: "Pengaturan Grafis — Arena Tembak Simple",
  description: "Kualitas, skala resolusi, sudut pandang, dan pengukur FPS.",
};

export default function GraphicsSettingsRoute() {
  return (
    <main className="min-h-dvh">
      <GraphicsSettingsPage />
    </main>
  );
}
