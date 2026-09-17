import type { Metadata } from "next";
import { CollectionScreen } from "@/components/collection/collection-screen";

export const metadata: Metadata = {
  title: "Koleksi & Progres — Arena Tembak Simple",
  description:
    "Lihat kemajuan bertandingmu dan senjata apa saja yang sudah terbuka karenanya.",
};

/**
 * Halaman koleksi & progres. Kemajuan dan kepemilikan senjatanya masih dari
 * data tiruan; saat layer backend siap, sumbernya diganti tabel `player_stats`
 * dan `player_weapons`.
 */
export default function CollectionPage() {
  return (
    <main className="min-h-dvh">
      <CollectionScreen />
    </main>
  );
}
