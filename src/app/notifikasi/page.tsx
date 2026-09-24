import type { Metadata } from "next";
import { NotificationCenter } from "@/components/notifications/notification-center";

export const metadata: Metadata = {
  title: "Notifikasi Hadiah — Arena Tembak Simple",
  description: "Semua hadiah yang didapat: koin, skin, upgrade, hadiah killstreak, dan senjata baru.",
};

export default function NotificationsPage() {
  return (
    <main className="min-h-dvh">
      <NotificationCenter />
    </main>
  );
}
