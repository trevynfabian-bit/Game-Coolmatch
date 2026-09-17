import type { Metadata } from "next";
import { SettingsScreen } from "@/components/settings/settings-screen";

export const metadata: Metadata = {
  title: "Pengaturan — Arena Tembak Simple",
  description:
    "Atur suara, tombol, dan kualitas tampilan agar permainan terasa nyaman di perangkatmu.",
};

export default function SettingsPage() {
  return (
    <main className="min-h-dvh">
      <SettingsScreen />
    </main>
  );
}
