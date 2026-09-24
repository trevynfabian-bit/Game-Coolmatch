import type { Metadata } from "next";
import { WeaponCollectionPage } from "@/components/gallery/weapon-collection-page";

export const metadata: Metadata = {
  title: "Koleksi Senjata — Arena Tembak Simple",
  description: "Semua senjata yang dimiliki beserta skin, upgrade, statistik efektif, dan syarat membuka yang belum.",
};

export default function WeaponCollectionRoute() {
  return (
    <main className="min-h-dvh">
      <WeaponCollectionPage />
    </main>
  );
}
