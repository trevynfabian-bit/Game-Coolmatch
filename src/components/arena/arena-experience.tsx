"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { KeyboardControls } from "@react-three/drei";
import { ArenaHud } from "@/components/arena/hud/arena-hud";
import { ServerMatchSync } from "@/components/arena/server-match-sync";
import { CombatAudio } from "@/components/arena/combat-audio";
import { KEYBOARD_MAP } from "@/lib/game/controls";
import { armPlayerFrom } from "@/lib/game/arm-player";
import { resetBotRuntime } from "@/lib/game/bot-runtime";
import { resetSessionStats } from "@/lib/game/session-stats";
import { resetFighterHits } from "@/lib/game/fighter-runtime";
import { resetRespawnTimers } from "@/lib/game/respawn-runtime";
import { setRoundClock } from "@/lib/game/round-runtime";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";
import { TRIAL_ROUND_SECONDS, TRIAL_SCORE_LIMIT, useTrialStore } from "@/lib/store/trial-store";
import { startServerMatch } from "@/lib/store/server-match-store";
import { findMap } from "@/lib/mock/maps";
import { buildMatchSnapshot } from "@/lib/mock/match";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";
import type { ArenaMapInfo, Difficulty, MatchSnapshot } from "@/types/game";

/** Pilihan pemain yang dipakai menyusun pertandingan saat arena dibuka. */
interface MatchEntry {
  difficulty: Difficulty;
  botCount: number;
  weaponId: string;
  map: ArenaMapInfo;
  rules?: { totalRounds: number; roundSeconds: number; scoreLimit: number };
  idPrefix?: string;
}

/**
 * Penanda "render ini sudah di browser". Nilainya tidak pernah berubah setelah
 * terpasang, jadi tidak ada yang perlu dilanggani; yang penting adalah potret
 * server-nya berbeda, sehingga React memakai `false` saat hidrasi lalu langsung
 * merender ulang dengan `true`. Ini cara memakai nilai yang hanya ada di
 * browser tanpa membuat hasil prerender dan hasil hidrasi berselisih.
 */
const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * Placeholder selagi bundel 3D diunduh dan konteks WebGL disiapkan. Sengaja
 * tanpa nama peta: pilihan peta baru terbaca sesudah hidrasi, dan teks yang
 * berbeda antara prerender dan hidrasi akan ditolak React.
 */
function SceneFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-slate-950">
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400"
          role="status"
          aria-label="Memuat arena"
        />
        <p className="text-sm text-slate-300">Memuat arena…</p>
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
    loading: () => <SceneFallback />,
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
export function ArenaExperience({ match, trial = false }: { match?: MatchSnapshot; trial?: boolean }) {
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
    if (trial) {
      // Uji coba: senjata, jumlah, dan tingkat lawan dari menu uji coba; satu
      // ronde singkat supaya benar-benar "kilat".
      const trialSetup = useTrialStore.getState();
      return {
        difficulty: trialSetup.difficulty,
        botCount: trialSetup.botCount,
        weaponId: trialSetup.weaponId,
        map: findMap(setup.mapId),
        rules: { totalRounds: 1, roundSeconds: TRIAL_ROUND_SECONDS, scoreLimit: TRIAL_SCORE_LIMIT },
        idPrefix: "uji",
      };
    }
    return {
      difficulty: setup.difficulty,
      botCount: setup.botCount,
      weaponId: useLoadoutStore.getState().selectedWeaponId,
      map: findMap(setup.mapId),
    };
  });

  const hydrated = useSyncExternalStore(subscribeNever, onClient, onServer);

  /**
   * Pertandingan disusun dari pengaturan tadi. Prop `match` tetap dibuka supaya
   * pemanggil bisa memberi potret siap pakai — nanti dipakai layer backend
   * untuk mengoper pertandingan yang dibuat server.
   */
  const armedMatch = useMemo<MatchSnapshot | null>(
    () => match ?? (hydrated ? buildMatchSnapshot(entry) : null),
    [match, hydrated, entry],
  );

  // Potret pertandingan menjadi keadaan awal store; sejak itu seluruh HUD dan
  // arena membaca state yang hidup, bukan data tiruan yang statis.
  useEffect(() => {
    if (!armedMatch) return;
    resetFighterHits();
    resetRespawnTimers();
    resetBotRuntime();
    resetSessionStats();
    useKillstreakStore.getState().resetForMatch();
    setRoundClock(armedMatch.round.secondsLeft);
    useMatchStore.getState().init(armedMatch);
    armPlayerFrom(armedMatch);
    void startServerMatch(armedMatch, { isTrial: trial });
  }, [armedMatch, trial]);

  // Selagi pengaturan dibaca, tampilkan layar tunggu yang sama dengan yang
  // dipakai saat bundel 3D diunduh — buat pemain tidak ada kedipan tambahan,
  // karena kanvas memang belum bisa tampil pada tahap ini.
  if (!armedMatch) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-slate-950">
        <SceneFallback />
      </div>
    );
  }

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <div className="relative h-full w-full overflow-hidden bg-slate-950">
        <ServerMatchSync />
        <CombatAudio />
        <ArenaScene match={armedMatch} />
        <ArenaHud match={armedMatch} trial={trial} />
      </div>
    </KeyboardControls>
  );
}
