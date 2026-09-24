import type { Metadata } from "next";
import { SkinCollectionView } from "@/components/skins/skin-collection";

export const metadata: Metadata = {
  title: "Skin Milikku — Arena Tembak Simple",
  description: "Daftar skin yang sudah dibeli dan senjata tempat masing-masing terpasang.",
};

export default function SkinCollectionPage() {
  return (
    <main className="min-h-dvh">
      <SkinCollectionView />
    </main>
  );
}
