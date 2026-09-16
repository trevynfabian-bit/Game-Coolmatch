"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { ArenaHud } from "@/components/arena/hud/arena-hud";
import { KEYBOARD_MAP } from "@/lib/game/controls";
import { armPlayerFrom } from "@/lib/game/arm-player";
import { resetFighterHits } from "@/lib/game/fighter-runtime";
import { resetRespawnTimers } from "@/lib/game/respawn-runtime";
import { setRoundClock } from "@/lib/game/round-runtime";
import { useMatchStore } from "@/lib/store/match-store";
import { MOCK_MATCH } from "@/lib/mock/match";
import { findWeapon } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import type { MatchSnapshot } from "@/types/game";

/** Placeholder selagi bundel 3D diunduh dan konteks WebGL disiapkan. */
function SceneFallback({ mapName }: { mapName: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-slate-950">
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400"
          role="status"
          aria-label="Memuat arena"
        />
        <p className="text-sm text-slate-300">Memuat arena {mapName}…</p>
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
    loading: () => <SceneFallback mapName={MOCK_MATCH.map.name} />,
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
export function ArenaExperience({
  match = MOCK_MATCH,
}: {
  match?: MatchSnapshot;
}) {
  /**
   * Senjata yang dipilih di halaman Pilih Senjata dibawa masuk ke arena.
   *
   * Dibaca SEKALI saat arena dibuka, bukan dilanggani. Pemain bisa menukar
   * senjata di tengah pertandingan, dan pergantian itu ikut memperbarui pilihan
   * di loadout store; kalau nilai ini dilanggani, potret pertandingan akan
   * disusun ulang dan seluruh pertandingan ikut dimulai dari awal.
   */
  const [entryWeaponId] = useState(
    () => useLoadoutStore.getState().selectedWeaponId,
  );

  /**
   * Isi magasin awal dijepit ke kapasitas senjata yang dibawa, sebab angka pada
   * potret pertandingan mengacu pada senjata bawaan yang magasinnya bisa lebih
   * besar.
   */
  const armedMatch = useMemo<MatchSnapshot>(() => {
    const weapon = findWeapon(entryWeaponId);
    return {
      ...match,
      fighters: match.fighters.map((fighter) =>
        fighter.isLocal ? { ...fighter, weaponId: weapon.id } : fighter,
      ),
      ammoInMagazine: Math.min(match.ammoInMagazine, weapon.magazineSize),
    };
  }, [match, entryWeaponId]);

  // Potret pertandingan menjadi keadaan awal store; sejak itu seluruh HUD dan
  // arena membaca state yang hidup, bukan data tiruan yang statis.
  useEffect(() => {
    resetFighterHits();
    resetRespawnTimers();
    setRoundClock(armedMatch.round.secondsLeft);
    useMatchStore.getState().init(armedMatch);
    armPlayerFrom(armedMatch);
  }, [armedMatch]);

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <div className="relative h-full w-full overflow-hidden bg-slate-950">
        <ArenaScene match={armedMatch} />
        <ArenaHud match={armedMatch} />
      </div>
    </KeyboardControls>
  );
}
