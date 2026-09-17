"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { KeyboardControls } from "@react-three/drei";
import { PracticeHud } from "@/components/practice/practice-hud";
import { buildKeyboardMap } from "@/lib/game/keybinds";
import { useKeybindStore } from "@/lib/store/keybind-store";
import { useAudioSettings } from "@/lib/audio/use-audio-settings";
import { useArenaMusic } from "@/lib/audio/use-arena-music";
import { armPlayerFrom } from "@/lib/game/arm-player";
import { resetFighterHits } from "@/lib/game/fighter-runtime";
import { resetRespawnTimers } from "@/lib/game/respawn-runtime";
import { practiceMatch } from "@/lib/practice/practice-match";
import { findWeapon } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useMatchStore } from "@/lib/store/match-store";
import { usePracticeStore } from "@/lib/store/practice-store";

function SceneFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-slate-950">
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400"
          role="status"
          aria-label="Memuat tempat latihan"
        />
        <p className="text-sm text-slate-300">Menyiapkan tempat latihan…</p>
      </div>
    </div>
  );
}

const PracticeScene = dynamic(
  () =>
    import("@/components/practice/practice-scene").then(
      (mod) => mod.PracticeScene,
    ),
  { ssr: false, loading: () => <SceneFallback /> },
);

/**
 * Akar tempat latihan. Memakai senjata yang sedang dipilih di halaman Pilih
 * Senjata, dan menyiapkan match store dengan potret latihan sehingga sistem
 * senjata yang sama dengan arena bisa dipakai apa adanya.
 */
export function PracticeExperience() {
  const selectedWeaponId = useLoadoutStore((state) => state.selectedWeaponId);
  const weapon = useMemo(
    () => findWeapon(selectedWeaponId),
    [selectedWeaponId],
  );
  const snapshot = useMemo(() => practiceMatch(weapon), [weapon]);
  // Tombol yang sama dengan arena, disusun dari satu fungsi supaya keduanya
  // mustahil berjalan dengan pemetaan yang berbeda.
  const bindings = useKeybindStore((state) => state.bindings);
  useAudioSettings();
  useArenaMusic();
  const keyboardMap = useMemo(() => buildKeyboardMap(bindings), [bindings]);

  useEffect(() => {
    resetFighterHits();
    resetRespawnTimers();
    usePracticeStore.getState().reset();
    useMatchStore.getState().init(snapshot);
    armPlayerFrom(snapshot);
  }, [snapshot]);

  return (
    <KeyboardControls map={keyboardMap}>
      <div className="relative h-full w-full overflow-hidden bg-slate-950">
        <PracticeScene snapshot={snapshot} weapon={weapon} />
        <PracticeHud weapon={weapon} />
      </div>
    </KeyboardControls>
  );
}
