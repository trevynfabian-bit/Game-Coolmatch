"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { KeyboardControls } from "@react-three/drei";
import { PracticeHud } from "@/components/practice/practice-hud";
import { KEYBOARD_MAP } from "@/lib/game/controls";
import { resetFighterHits } from "@/lib/game/fighter-runtime";
import { resetRespawnTimers } from "@/lib/game/respawn-runtime";
import { practiceMatch } from "@/lib/practice/practice-match";
import { findWeapon } from "@/lib/mock/weapons";
import { useCombatStore } from "@/lib/store/combat-store";
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
  const weapon = useMemo(() => findWeapon(selectedWeaponId), [selectedWeaponId]);
  const snapshot = useMemo(() => practiceMatch(weapon), [weapon]);

  useEffect(() => {
    resetFighterHits();
    resetRespawnTimers();
    usePracticeStore.getState().reset();
    useMatchStore.getState().init(snapshot);
    useCombatStore.getState().arm({
      ammoInMagazine: snapshot.ammoInMagazine,
      ammoReserve: snapshot.ammoReserve,
      magazineSize: weapon.magazineSize,
    });
  }, [snapshot, weapon.magazineSize]);

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <div className="relative h-full w-full overflow-hidden bg-slate-950">
        <PracticeScene snapshot={snapshot} weapon={weapon} />
        <PracticeHud weapon={weapon} />
      </div>
    </KeyboardControls>
  );
}
