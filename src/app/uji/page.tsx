import type { Metadata } from "next";
import { TrialScreen } from "@/components/trial/trial-screen";

export const metadata: Metadata = {
  title: "Coba di Arena — Arena Tembak Simple",
  description:
    "Uji sebuah senjata dalam pertandingan singkat melawan musuh otomatis sebelum membawanya ke pertandingan penuh.",
};

/**
 * Halaman uji coba senjata.
 *
 * Senjata yang dicoba boleh disebut lewat alamatnya (`/uji?senjata=<id>`),
 * dan itulah yang dipakai tombol "Coba di arena" di halaman Koleksi. Jalur ini
 * sengaja lewat alamat, bukan lewat penyimpanan bersama: menekan tombol di
 * daftar koleksi hanya berarti "tunjukkan senjata ini", jadi ia tidak boleh
 * mengubah perlengkapan pemain maupun meninggalkan niat yang menempel bila ia
 * berubah pikiran dan pergi.
 *
 * Membaca alamat membuat halaman ini dirender saat diminta. Isinya memang
 * tidak bisa diketahui lebih awal, jadi tidak ada yang hilang.
 */
export default async function TrialPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { senjata } = await searchParams;
  // Alamat boleh menyebut parameter yang sama berkali-kali; yang pertama saja
  // yang dipakai. Sahnya id diperiksa layar di bawah, yang memang tahu senjata
  // mana yang sudah terbuka.
  const weaponId = Array.isArray(senjata) ? senjata[0] : senjata;

  return (
    <main className="min-h-dvh">
      <TrialScreen initialWeaponId={weaponId} />
    </main>
  );
}
