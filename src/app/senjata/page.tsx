import type { Metadata } from "next";
import { WeaponPicker } from "@/components/weapons/weapon-picker";

export const metadata: Metadata = {
  title: "Pilih Senjata — Arena Tembak Simple",
  description:
    "Bandingkan kerusakan, laju tembak, akurasi, dan kontrol tiap senjata sebelum masuk arena.",
};

/**
 * Halaman pilih senjata. Daftarnya masih dari data tiruan; saat layer backend
 * siap, sumbernya tinggal diganti hasil pengambilan tabel `weapons`.
 */
export default function WeaponsPage() {
  return (
    <main className="min-h-dvh">
      <WeaponPicker />
    </main>
  );
}
