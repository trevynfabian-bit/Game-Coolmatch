import type { Metadata } from "next";
import { CollectionGallery } from "@/components/gallery/collection-gallery";

export const metadata: Metadata = {
  title: "Galeri Koleksi — Arena Tembak Simple",
  description: "Semua senjata, skin, dan attachment milik pemain dalam satu halaman.",
};

export default function CollectionPage() {
  return (
    <main className="min-h-dvh">
      <CollectionGallery />
    </main>
  );
}
