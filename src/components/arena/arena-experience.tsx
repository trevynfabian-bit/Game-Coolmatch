"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { ArenaHud } from "@/components/arena/hud/arena-hud";
import { buildKeyboardMap } from "@/lib/game/keybinds";
import { useKeybindStore } from "@/lib/store/keybind-store";
import { useAudioSettings } from "@/lib/audio/use-audio-settings";
import { useArenaMusic } from "@/lib/audio/use-arena-music";
import { armPlayerFrom } from "@/lib/game/arm-player";
import { resetBotRuntime } from "@/lib/game/bot-runtime";
import { resetFighterHits } from "@/lib/game/fighter-runtime";
import { resetRespawnTimers } from "@/lib/game/respawn-runtime";
import { setRoundClock } from "@/lib/game/round-runtime";
import { useMatchStore } from "@/lib/store/match-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { findMap } from "@/lib/mock/maps";
import { buildMatchSnapshot, type MatchRules } from "@/lib/mock/match";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useProfileStore } from "@/lib/store/profile-store";
import { useMapStore } from "@/lib/store/map-store";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";
import {
  TRIAL_BOT_COUNT,
  TRIAL_DIFFICULTY,
  TRIAL_RULES,
  useTrialStore,
} from "@/lib/store/trial-store";
import type { Difficulty, MatchSnapshot } from "@/types/game";

/** Pilihan pemain yang dipakai menyusun pertandingan saat arena dibuka. */
interface MatchEntry {
  difficulty: Difficulty;
  botCount: number;
  weaponId: string;
  mapId: string;
  /** Nama pemain saat pertandingan disusun; ikut ke HUD, kill feed, dan klasemen. */
  playerName: string;
  /** Aturan pengganti; hanya terisi untuk pertandingan uji coba. */
  rules?: Partial<MatchRules>;
  /**
   * Benar bila arena ini dibuka dari layar Coba di Arena. Dicatat terpisah dari
   * `rules` supaya HUD bisa mengatakannya apa adanya — aturan yang berbeda
   * saja tidak cukup menjelaskan kenapa pertandingannya sependek itu.
   */
  isTrial: boolean;
}

/**
 * Placeholder selagi bundel 3D diunduh dan konteks WebGL disiapkan.
 *
 * `mapName` boleh kosong, dan itu bukan kemalasan. Layar ini juga dipakai
 * SEBELUM hidrasi, saat pilihan peta yang tersimpan belum terbaca: server
 * selalu merender keadaan awal store, sedangkan browser sudah memegang peta
 * pilihan pemain. Menyebut nama peta pada saat itu membuat kedua hasil render
 * berselisih dan React menolak halamannya.
 */
function SceneFallback({ mapName }: { mapName?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-slate-950">
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400"
          role="status"
          aria-label="Memuat arena"
        />
        <p className="text-sm text-slate-300">
          {mapName ? `Memuat arena ${mapName}…` : "Memuat arena…"}
        </p>
        <p className="mt-1 text-xs text-slate-500">Menyiapkan mesin 3D</p>
      </div>
    </div>
  );
}

/**
 * Kanvas 3D butuh WebGL, jadi hanya dimuat di browser. Dimuat dinamis dengan
 * `ssr: false` supaya tidak ada upaya render di server.
 */
const ArenaScene = dynamic(
  () => import("@/components/arena/arena-scene").then((mod) => mod.ArenaScene),
  {
    ssr: false,
    // Nama peta dibaca saat bundel diunduh, di luar render komponen, jadi
    // diambil langsung dari store alih-alih lewat prop. Yang penting layar
    // tunggu menyebut arena yang benar-benar akan dimuat.
    loading: () => (
      <SceneFallback
        mapName={findMap(useMapStore.getState().selectedMapId).name}
      />
    ),
  },
);

/**
 * Akar halaman arena: menyatukan kanvas 3D dengan lapisan HUD di atasnya.
 * `KeyboardControls` membungkus keduanya — React Three Fiber menjembatani
 * context-nya ke dalam kanvas, jadi controller di dalam scene tetap bisa
 * membaca tombol yang ditekan.
 *
 * Sumber datanya masih `MOCK_MATCH`; prop `match` sengaja dibuka supaya task
 * backend nanti tinggal mengoper data asli dari server.
 */
export function ArenaExperience({ match }: { match?: MatchSnapshot }) {
  /**
   * Senjata dan pengaturan lawan yang dipilih pemain dibaca SEKALI saat arena
   * dibuka, bukan dilanggani. Pemain bisa menukar senjata di tengah
   * pertandingan, dan pergantian itu ikut memperbarui pilihan di loadout store;
   * kalau nilainya dilanggani, potret pertandingan akan disusun ulang dan
   * seluruh pertandingan ikut dimulai dari awal.
   *
   * Nilainya baru DIPAKAI setelah hidrasi. Pengaturan lawan dipulihkan dari
   * localStorage yang hanya ada di browser, sehingga hasil prerender — yang
   * selalu memakai nilai bawaan — bisa berbeda dari render hidrasi, dan React
   * menolak halaman yang tidak cocok itu. Render pertama di browser karena itu
   * menampilkan layar tunggu yang sama persis dengan hasil prerender, lalu
   * arena disusun pada render berikutnya.
   */
  const [entry] = useState<MatchEntry>(() => {
    const setup = useMatchSetupStore.getState();
    const mapId = useMapStore.getState().selectedMapId;
    const playerName = useProfileStore.getState().playerName;

    /*
      Uji coba yang menunggu dibaca TANPA dihapus di sini. Initialiser useState
      boleh dijalankan lebih dari sekali oleh React, jadi ia harus murni;
      penghapusannya menunggu efek di bawah, sesudah pertandingan tersusun.
    */
    const trial = useTrialStore.getState().pending;
    if (trial) {
      return {
        difficulty: TRIAL_DIFFICULTY,
        botCount: TRIAL_BOT_COUNT,
        weaponId: trial.weaponId,
        mapId,
        playerName,
        rules: TRIAL_RULES,
        isTrial: true,
      };
    }

    return {
      difficulty: setup.difficulty,
      botCount: setup.botCount,
      weaponId: useLoadoutStore.getState().selectedWeaponId,
      mapId,
      playerName,
      isTrial: false,
    };
  });

  const hydrated = useHydrated();
  useAudioSettings();
  useArenaMusic();

  /**
   * Pemetaan tombol disusun dari pilihan pemain dan ikut berubah saat ia
   * mengaturnya — berbeda dengan pengaturan lain di layar ini, yang dibaca
   * sekali supaya pertandingan tidak tersusun ulang. Tombol aman dilanggani:
   * drei hanya mengganti pendengar papan ketiknya, tanpa menyentuh
   * pertandingan yang sedang berjalan.
   */
  const bindings = useKeybindStore((state) => state.bindings);
  const keyboardMap = useMemo(() => buildKeyboardMap(bindings), [bindings]);

  /**
   * Pertandingan disusun dari pengaturan tadi. Prop `match` tetap dibuka supaya
   * pemanggil bisa memberi potret siap pakai — nanti dipakai layer backend
   * untuk mengoper pertandingan yang dibuat server.
   */
  const armedMatch = useMemo<MatchSnapshot | null>(() => {
    if (match) return match;
    if (!hydrated) return null;
    return buildMatchSnapshot({
      difficulty: entry.difficulty,
      botCount: entry.botCount,
      weaponId: entry.weaponId,
      playerName: entry.playerName,
      map: findMap(entry.mapId),
      rules: entry.rules,
    });
  }, [match, hydrated, entry]);

  /**
   * Potret pertandingan dari server tidak pernah uji coba: uji coba disusun di
   * sini, dari niat yang dititipkan layar Coba di Arena.
   */
  const isTrial = !match && entry.isTrial;

  // Potret pertandingan menjadi keadaan awal store; sejak itu seluruh HUD dan
  // arena membaca state yang hidup, bukan data tiruan yang statis.
  useEffect(() => {
    if (!armedMatch) return;
    resetFighterHits();
    resetRespawnTimers();
    resetBotRuntime();
    setRoundClock(armedMatch.round.secondsLeft);
    useMatchStore.getState().init(armedMatch);
    armPlayerFrom(armedMatch);

    /*
      Niat uji coba dibuang begitu pertandingannya berdiri. Sekali pakai, dan
      itu disengaja: tanpa ini, pemain yang menutup arena lalu menekan "Main
      Cepat" besok akan mendapat aturan uji coba lagi — satu ronde tujuh kill —
      tanpa pernah memintanya, dan tanpa petunjuk kenapa. Potretnya sendiri
      sudah tersimpan di `armedMatch`, jadi "Main lagi" tetap mengulang uji coba
      yang sama.
    */
    useTrialStore.getState().consume();
  }, [armedMatch]);

  // Selagi pengaturan dibaca, tampilkan layar tunggu yang sama dengan yang
  // dipakai saat bundel 3D diunduh — buat pemain tidak ada kedipan tambahan,
  // karena kanvas memang belum bisa tampil pada tahap ini.
  if (!armedMatch) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-slate-950">
        {/* Tanpa nama peta: cabang ini hanya tercapai sebelum hidrasi, dan
            pada saat itu pilihan pemain belum boleh ikut dibaca. */}
        <SceneFallback />
      </div>
    );
  }

  return (
    <KeyboardControls map={keyboardMap}>
      <div className="relative h-full w-full overflow-hidden bg-slate-950">
        <ArenaScene match={armedMatch} />
        <ArenaHud match={armedMatch} isTrial={isTrial} />
      </div>
    </KeyboardControls>
  );
}
