import type { Metadata } from "next";
import { OpponentSetup } from "@/components/opponents/opponent-setup";

export const metadata: Metadata = {
  title: "Atur Lawan — Arena Tembak Simple",
  description:
    "Atur tingkat kesulitan dan jumlah musuh otomatis sebelum masuk arena.",
};

/**
 * Halaman pengaturan lawan. Pilihannya disimpan di useMatchSetupStore dan
 * dipakai arena saat menyusun pertandingan baru.
 */
export default function OpponentsPage() {
  return (
    <main className="min-h-dvh">
      <OpponentSetup />
    </main>
  );
}
