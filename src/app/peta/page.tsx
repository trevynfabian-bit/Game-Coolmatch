import type { Metadata } from "next";
import { MapPicker } from "@/components/maps/map-picker";

export const metadata: Metadata = {
  title: "Pilih Peta — Arena Tembak Simple",
  description: "Pilih arena pertandingan berikutnya, lengkap dengan denah 2D penghalang dan titik muncul.",
};

export default function MapsPage() {
  return (
    <main className="min-h-dvh">
      <MapPicker />
    </main>
  );
}
