"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { TrialWeaponOption } from "@/components/trial/trial-weapon-option";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { difficultyProfile } from "@/lib/game/difficulty";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { findMap } from "@/lib/mock/maps";
import { DEFAULT_MATCH_RULES } from "@/lib/mock/match";
import { unlockedWeapons } from "@/lib/mock/player-weapons";
import { findWeapon } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useMapStore } from "@/lib/store/map-store";
import { useEarnedWeapons } from "@/lib/store/unlock-store";
import {
  TRIAL_BOT_COUNT,
  TRIAL_DIFFICULTY,
  TRIAL_RULES,
  useTrialStore,
} from "@/lib/store/trial-store";

/** Satu angka aturan beserta keterangannya. */
function RuleTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-center">
      <p className="font-mono text-lg leading-6 font-semibold text-slate-100 tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] tracking-wider text-slate-500 uppercase">
        {label}
      </p>
    </div>
  );
}

/**
 * Halaman Coba di Arena: mencoba sebuah senjata melawan lawan yang benar-benar
 * balas menembak, tanpa mengganggu pertandingan yang sedang disiapkan pemain.
 *
 * Ini pelengkap tempat latihan, bukan penggantinya. Sasaran diam di `/latihan`
 * menjawab "seberapa enak senjata ini ditembakkan"; hanya lawan yang bergerak,
 * menembak balik, dan menyudutkan yang bisa menjawab "senjata ini cocok
 * tidak untuk saya". Dua pertanyaan berbeda, dua tempat berbeda.
 *
 * Pertandingannya sengaja pendek — satu ronde, batas kill rendah, dua menit —
 * supaya mencoba senjata terasa seperti mencoba, bukan seperti terikat satu
 * pertandingan penuh yang hasilnya tidak diinginkan pemain.
 */
export function TrialScreen({ initialWeaponId }: { initialWeaponId?: string }) {
  const router = useRouter();
  const armTrial = useTrialStore((state) => state.arm);
  const hydrated = useHydrated();
  const selectedMapId = useMapStore((state) => state.selectedMapId);

  /** Hanya senjata terbuka; yang terkunci belum bisa dibawa ke mana pun. */
  const earned = useEarnedWeapons();
  const weapons = useMemo(() => unlockedWeapons(earned), [earned]);

  /**
   * Pilihan uji coba berdiri SENDIRI, tidak menulis balik ke perlengkapan yang
   * dibawa bertanding. Mencoba sebuah senjata bukan pernyataan bahwa pemain
   * ingin memakainya; menukar senjata pertandingannya diam-diam karena ia
   * penasaran adalah kejutan yang tidak ia minta.
   *
   * Nilai awalnya berasal dari alamat halaman bila ada — begitulah tombol di
   * halaman Koleksi menunjuk satu senjata tertentu — dan kalau tidak, dari
   * senjata yang sedang ia bawa. Keduanya disaring: senjata terkunci atau id
   * yang tidak dikenal jatuh ke senjata terbuka pertama.
   */
  const [weaponId, setWeaponId] = useState<string>(() => {
    const terbuka = new Set(weapons.map((weapon) => weapon.id));
    const diminta =
      initialWeaponId && terbuka.has(initialWeaponId) ? initialWeaponId : null;
    const dibawa = useLoadoutStore.getState().selectedWeaponId;
    return diminta ?? (terbuka.has(dibawa) ? dibawa : weapons[0].id);
  });

  const selectedIndex = Math.max(
    0,
    weapons.findIndex((weapon) => weapon.id === weaponId),
  );
  const selected = findWeapon(weapons[selectedIndex].id);

  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Tombol panah memindahkan pilihan, Home dan End melompat ke ujung.
   *
   * Wajib ada begitu daftar ini dinyatakan sebagai sekelompok radio: hanya
   * senjata terpilih yang masuk urutan Tab, jadi tanpa tombol panah senjata
   * lain tidak bisa dicapai dari papan ketik sama sekali.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const jumlah = weapons.length;
      let tujuan: number;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          tujuan = (selectedIndex + 1) % jumlah;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          tujuan = (selectedIndex - 1 + jumlah) % jumlah;
          break;
        case "Home":
          tujuan = 0;
          break;
        case "End":
          tujuan = jumlah - 1;
          break;
        default:
          return;
      }

      // Panah atas/bawah menggulung halaman bila dibiarkan, dan gulungan itu
      // membuat senjata yang baru dipilih justru keluar dari pandangan.
      event.preventDefault();
      setWeaponId(weapons[tujuan].id);
      optionRefs.current[tujuan]?.focus();
    },
    [selectedIndex, weapons],
  );

  const profile = difficultyProfile(TRIAL_DIFFICULTY);

  /**
   * Menyiapkan uji coba TEPAT sebelum berpindah, bukan lebih awal.
   *
   * Arena mengambil niat ini sekali lalu membuangnya. Kalau ia disiapkan
   * sejak halaman ini dibuka, pemain yang berubah pikiran dan kembali ke menu
   * akan mendapati pertandingan berikutnya diam-diam memakai aturan uji coba.
   */
  const masukArena = () => {
    armTrial({ weaponId: selected.id });
    router.push("/arena");
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Uji coba senjata
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Coba di Arena
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Sasaran diam di tempat latihan tidak pernah balas menembak. Di sini
          senjatanya diuji melawan lawan sungguhan dalam pertandingan singkat,
          jadi kamu tahu rasanya sebelum membawanya ke pertandingan penuh.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Senjata yang dicoba
        </h2>
        <div
          role="radiogroup"
          aria-label="Senjata yang bisa dicoba"
          onKeyDown={onKeyDown}
          className="space-y-2"
        >
          {weapons.map((weapon, index) => (
            <TrialWeaponOption
              key={weapon.id}
              weapon={weapon}
              selected={weapon.id === selected.id}
              onSelect={() => setWeaponId(weapon.id)}
              buttonRef={(element) => {
                optionRefs.current[index] = element;
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Hanya senjata yang sudah terbuka yang bisa dicoba. Pilihan di sini
          tidak mengubah senjata yang kamu bawa bertanding.
        </p>
      </section>

      <section className="mb-8 rounded-xl border border-white/10 bg-slate-900/40 px-5 py-4">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Aturan uji coba
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <RuleTile value={`${TRIAL_RULES.totalRounds}`} label="Ronde" />
          <RuleTile value={`${TRIAL_RULES.scoreLimit}`} label="Batas kill" />
          <RuleTile
            value={`${Math.round(TRIAL_RULES.roundSeconds / 60)} mnt`}
            label="Waktu"
          />
          <RuleTile value={`${TRIAL_BOT_COUNT}`} label="Lawan" />
        </div>

        {/*
          Nama peta baru disebut sesudah hidrasi. Pilihan peta tersimpan di
          perangkat, sementara server selalu merender pilihan bawaan — menyebut
          namanya lebih awal membuat kedua hasil render berselisih.
        */}
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Melawan {TRIAL_BOT_COUNT} musuh tingkat {profile.label.toLowerCase()}{" "}
          di{" "}
          {hydrated ? (
            <span className="font-medium text-slate-300">
              {findMap(selectedMapId).name}
            </span>
          ) : (
            "peta pilihanmu"
          )}
          {/* Pembandingnya dibaca dari aturan pertandingan biasa, bukan
              ditulis ulang sebagai angka: dua salinan aturan yang sama adalah
              dua tempat yang bisa berselisih. */}
          . Jauh lebih singkat daripada pertandingan biasa, yang berjalan{" "}
          {DEFAULT_MATCH_RULES.totalRounds} ronde sampai batas{" "}
          {DEFAULT_MATCH_RULES.scoreLimit} kill.
        </p>
      </section>

      <ActionRow>
        <ActionButton variant="utama" onClick={masukArena}>
          Coba {selected.name}
        </ActionButton>
        <ActionButton href="/latihan">Tempat latihan</ActionButton>
        <ActionButton href="/koleksi">Koleksi</ActionButton>
        <ActionButton href="/">Kembali ke menu</ActionButton>
      </ActionRow>
    </div>
  );
}
