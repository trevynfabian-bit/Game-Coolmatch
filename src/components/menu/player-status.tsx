"use client";

import Link from "next/link";
import { difficultyProfile } from "@/lib/game/difficulty";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { findMap } from "@/lib/mock/maps";
import { findWeapon } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useMapStore } from "@/lib/store/map-store";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";
import { useProfileStore } from "@/lib/store/profile-store";

/**
 * Sapaan dan ringkasan pilihan yang tersimpan.
 *
 * Satu-satunya bagian menu yang harus berjalan di browser, jadi ia dipisah
 * sendiri dan sisa menunya tetap komponen server: judul, keterangan, dan
 * seluruh tautannya ikut terprerender dan tetap bisa diklik walau berkas
 * skripnya belum selesai diunduh.
 *
 * Satu pulau, bukan empat label kecil. Keempat nilainya — nama, senjata, peta,
 * lawan — muncul dari sumber yang sama pada saat yang sama; memisahnya berarti
 * empat kali aturan hidrasi yang sama ditulis ulang, dan empat nilai yang
 * berkedip masuk sendiri-sendiri.
 */
export function PlayerStatus() {
  const hydrated = useHydrated();
  const playerName = useProfileStore((state) => state.playerName);
  const hasNamed = useProfileStore((state) => state.hasNamed);
  const selectedWeaponId = useLoadoutStore((state) => state.selectedWeaponId);
  const selectedMapId = useMapStore((state) => state.selectedMapId);
  const difficulty = useMatchSetupStore((state) => state.difficulty);
  const botCount = useMatchSetupStore((state) => state.botCount);

  /*
    Sebelum hidrasi tidak ada satu pun nilai ini yang boleh disebut: server
    merender keadaan awal store sementara browser sudah memegang pilihan
    pemain. Yang ditampilkan adalah kerangka setinggi isi sebenarnya, supaya
    yang berubah hanya tulisannya — bukan tinggi halamannya.
  */
  if (!hydrated) {
    return (
      <div aria-hidden className="mt-6 space-y-2">
        <div className="mx-auto h-5 w-44 rounded bg-white/5" />
        <div className="mx-auto h-4 w-64 rounded bg-white/5" />
      </div>
    );
  }

  const weapon = findWeapon(selectedWeaponId);
  const map = findMap(selectedMapId);
  const profile = difficultyProfile(difficulty);

  return (
    <div className="mt-6 space-y-2">
      <p className="text-sm text-slate-300">
        {hasNamed ? (
          <>
            Halo, <span className="font-semibold text-white">{playerName}</span>
            .
          </>
        ) : (
          <>
            Kamu bermain sebagai{" "}
            <span className="font-semibold text-white">{playerName}</span>.{" "}
            <Link
              href="/nama"
              className="text-emerald-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              Ganti nama
            </Link>
          </>
        )}
      </p>

      {/*
        Ketiga pilihan yang menentukan pertandingan berikutnya, disebut sebelum
        "Main Cepat" ditekan. Tombol yang menjanjikan "cepat" sebaiknya tidak
        menyimpan kejutan soal senjata atau arena apa yang akan dipakai.
      */}
      <p className="text-xs text-slate-500">
        {weapon.name}
        <span className="text-slate-700"> · </span>
        {map.name}
        <span className="text-slate-700"> · </span>
        {botCount} lawan {profile.label.toLowerCase()}
      </p>
    </div>
  );
}
