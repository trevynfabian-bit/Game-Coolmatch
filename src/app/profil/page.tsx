import type { Metadata } from "next";
import { ProfileScreen } from "@/components/profile/profile-screen";

export const metadata: Metadata = {
  title: "Profil Pemain — Arena Tembak Simple",
  description:
    "Nama, rekam jejak bertanding, dan tempat menggantinya. Tersimpan di perangkat ini, tanpa akun.",
};

/**
 * Halaman profil pemain. Rekam jejaknya masih dihitung dari riwayat tiruan;
 * saat layer backend siap, sumbernya tinggal diganti hasil pengambilan tabel
 * `matches` milik pemain ini.
 */
export default function ProfilePage() {
  return (
    <main className="min-h-dvh">
      <ProfileScreen />
    </main>
  );
}
