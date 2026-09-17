import type { Metadata } from "next";
import { MapPicker } from "@/components/maps/map-picker";

export const metadata: Metadata = {
  title: "Pilih Peta — Arena Tembak Simple",
  description:
    "Bandingkan ukuran, tempat berlindung, dan daya tampung tiap peta sebelum masuk arena.",
};

/**
 * Halaman pilih peta. Katalognya masih dari data tiruan; saat layer backend
 * siap, sumbernya tinggal diganti hasil pengambilan tabel `maps`.
 */
export default function MapsPage() {
  return (
    <main className="min-h-dvh">
      <MapPicker />
    </main>
  );
}
