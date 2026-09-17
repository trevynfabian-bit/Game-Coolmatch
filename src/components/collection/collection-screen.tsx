"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { CollectionEntryRow } from "@/components/collection/collection-entry-row";
import { NextUnlockPanel } from "@/components/progress/next-unlock";
import { ProgressSummary } from "@/components/progress/progress-summary";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { collectionFacts } from "@/lib/game/collection";
import {
  MOCK_PLAYER_PROGRESS,
  weaponOwnership,
} from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useEarnedWeapons } from "@/lib/store/unlock-store";

/**
 * Halaman Koleksi & Progres: seberapa jauh pemain sudah bermain, dan senjata
 * apa saja yang sudah terbuka karenanya.
 *
 * Kedua hal itu sengaja satu halaman, bukan dua. Angka kemajuan tanpa koleksi
 * hanya statistik, dan koleksi tanpa angka kemajuan tidak menjelaskan kenapa
 * sesuatu masih terkunci. Yang membuatnya berguna justru hubungan keduanya:
 * "kamu sudah menang 2 kali, tiga lagi senapan itu terbuka".
 *
 * Sumber datanya masih tiruan. Ketika layer backend siap, kemajuan diambil
 * dari tabel `player_stats` dan kepemilikan dari `player_weapons` — bentuk
 * yang dibaca komponen ini tidak berubah.
 */
export function CollectionScreen() {
  const router = useRouter();
  const selectWeapon = useLoadoutStore((state) => state.selectWeapon);
  const earned = useEarnedWeapons();

  const collection = useMemo(
    () => collectionFacts(MOCK_WEAPONS, (id) => weaponOwnership(id, earned)),
    [earned],
  );

  /**
   * "Latihan" memilih senjatanya lebih dulu, baru berpindah. Tempat latihan
   * memakai senjata yang sedang terpilih, jadi tanpa langkah itu pemain akan
   * sampai di sana memegang senjata lamanya — persis bukan yang baru saja ia
   * klik.
   *
   * Tombol sebelahnya, "Coba di arena", justru TIDAK menyentuh pilihan
   * senjata: ia menyebut senjatanya lewat alamat tujuan. Arena uji memang
   * berdiri di luar perlengkapan yang dibawa bertanding, dan penasaran pada
   * sebuah senjata bukan alasan untuk menukar senjata pertandingan pemain.
   */
  const cobaDiLatihan = (weaponId: string) => {
    selectWeapon(weaponId);
    router.push("/latihan");
  };

  const persen = Math.round(collection.completion * 100);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Koleksi & progres
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Senjatamu
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Makin sering bertanding, makin banyak senjata yang terbuka. Di sini
          terlihat sejauh mana kamu sudah melangkah dan apa yang tinggal sedikit
          lagi.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Progres main
        </h2>
        <ProgressSummary progress={MOCK_PLAYER_PROGRESS} />

        {/*
          Sasaran terdekat ikut bagian PROGRES, bukan bagian koleksi, dan itu
          bukan sekadar penempatan. Di bawah daftar koleksi ia berdiri tepat di
          atas baris senjatanya sendiri — nama, syarat, batang, dan sisa yang
          sama persis dua kali berturut-turut, terbaca seperti halaman yang
          tergagap. Di sini ia menjawab pertanyaan lanjutan yang wajar dari
          angka di atasnya: sudah sejauh ini, lalu apa yang dibelinya?
        */}
        {collection.nextUnlock ? (
          <NextUnlockPanel entry={collection.nextUnlock} className="mt-4" />
        ) : (
          <p className="mt-3 text-[11px] text-emerald-300/80">
            Seluruh senjata sudah terbuka. Tidak ada lagi yang perlu dikejar.
          </p>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[11px] tracking-[0.2em] text-slate-400 uppercase">
            Koleksi senjata
          </h2>
          <p className="text-[11px] text-slate-400">
            <span className="font-mono tabular-nums text-slate-200">
              {collection.unlocked} dari {collection.total}
            </span>{" "}
            terbuka
          </p>
        </div>

        {/* Satu bar untuk seluruh koleksi: sekali lihat, pemain tahu masih
            seberapa jauh perjalanannya. */}
        <div
          className="h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={persen}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Bagian koleksi senjata yang sudah terbuka"
        >
          <span
            className="block h-full rounded-full bg-emerald-400/70 transition-[width]"
            style={{ width: `${persen}%` }}
          />
        </div>

        <ul className="mt-4 space-y-2">
          {collection.entries.map((entry) => (
            <CollectionEntryRow
              key={entry.weapon.id}
              entry={entry}
              highlighted={entry.weapon.id === collection.nextUnlock?.weapon.id}
              onTry={() => cobaDiLatihan(entry.weapon.id)}
            />
          ))}
        </ul>
      </section>

      <ActionRow>
        <ActionButton variant="utama" href="/lawan">
          Bertanding lagi
        </ActionButton>
        <ActionButton href="/senjata">Pilih senjata</ActionButton>
        <ActionButton href="/">Kembali ke menu</ActionButton>
      </ActionRow>
    </div>
  );
}
