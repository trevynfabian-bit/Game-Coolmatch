"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { CollectionEntryRow } from "@/components/collection/collection-entry-row";
import { StatTile } from "@/components/scoreboard/stat-tile";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { collectionFacts, progressFacts } from "@/lib/game/collection";
import {
  MOCK_PLAYER_PROGRESS,
  weaponOwnership,
} from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";

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

  const progress = useMemo(() => progressFacts(MOCK_PLAYER_PROGRESS), []);
  const collection = useMemo(
    () => collectionFacts(MOCK_WEAPONS, weaponOwnership),
    [],
  );

  /**
   * "Coba di latihan" memilih senjatanya lebih dulu, baru berpindah. Tempat
   * latihan memakai senjata yang sedang terpilih, jadi tanpa langkah itu
   * pemain akan sampai di sana memegang senjata lamanya — persis bukan yang
   * baru saja ia klik.
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Pertandingan" value={progress.matchesPlayed} />
          <StatTile
            label="Menang"
            value={progress.wins}
            accent="text-emerald-300"
          />
          <StatTile
            label="Tingkat menang"
            value={`${progress.winRate}%`}
            accent="text-amber-300"
          />
          <StatTile
            label="Total kill"
            value={progress.totalKills}
            accent="text-sky-300"
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Rata-rata{" "}
          <span className="font-mono text-slate-400">
            {progress.killsPerMatch}
          </span>{" "}
          kill per pertandingan.
        </p>
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

        {collection.nextUnlock ? (
          <p className="mt-3 text-[11px] leading-relaxed text-amber-200/80">
            Paling dekat terbuka:{" "}
            <span className="font-medium text-amber-200">
              {collection.nextUnlock.weapon.name}
            </span>{" "}
            — {collection.nextUnlock.ownership.requirement?.toLowerCase()} (
            {collection.nextUnlock.ownership.progressLabel}).
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-emerald-300/80">
            Seluruh senjata sudah terbuka. Tidak ada lagi yang perlu dikejar.
          </p>
        )}

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
