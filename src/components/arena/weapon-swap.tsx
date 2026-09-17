"use client";

import { useEffect, useRef } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { defaultReserveFor } from "@/lib/game/arm-player";
import {
  SLOT_ACTIONS,
  WEAPON_SWAP_SECONDS,
  type MoveAction,
} from "@/lib/game/controls";
import { unlockedWeapons } from "@/lib/mock/player-weapons";
import { findWeapon } from "@/lib/mock/weapons";
import { useCombatStore } from "@/lib/store/combat-store";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import { useUnlockStore } from "@/lib/store/unlock-store";

/**
 * Senjata yang boleh dibawa bertanding, urut sesuai nomor slotnya.
 *
 * Dihitung saat dibutuhkan, bukan sekali saat modul dimuat. Senjata bisa
 * terbuka di tengah bermain, dan deretan slot yang dibekukan sejak halaman
 * dibuka akan menyembunyikan senjata yang barusan dirayakan pemain — termasuk
 * senjata yang sedang ia pegang.
 */
export function swapSlots(earned: readonly string[]) {
  return unlockedWeapons(earned);
}

/**
 * Menukar senjata di tengah pertandingan lewat tombol angka.
 *
 * Perpindahan tidak seketika: pelatuk terkunci selama tangan masih berganti
 * senjata, jadi menukar di tengah baku tembak benar-benar berisiko. Amunisi
 * tiap senjata diingat combat store, sehingga menukar bolak-balik tidak bisa
 * dipakai sebagai isi ulang instan.
 */
export function WeaponSwap() {
  const [subscribeKeys] = useKeyboardControls<MoveAction>();
  const pendingWeaponId = useRef<string | null>(null);
  const swapEndsAt = useRef(0);

  useEffect(() => {
    const unsubscribes = SLOT_ACTIONS.map((action, index) =>
      subscribeKeys(
        (state) => state[action],
        (pressed) => {
          if (!pressed) return;

          // Dibaca dari keadaan terkini, bukan dari tangkapan saat efek
          // dipasang: senjata yang terbuka di tengah pertandingan harus
          // langsung bisa dipilih dengan nomornya.
          const target = swapSlots(useUnlockStore.getState().unlocked)[index];
          if (!target) return;
          if (!usePlayerStore.getState().isLocked) return;

          const match = useMatchStore.getState();
          if (match.round.status !== "live") return;

          const local = match.fighters.find((fighter) => fighter.isLocal);
          if (!local || !local.isAlive) return;

          const combat = useCombatStore.getState();
          if (combat.isSwapping) return;
          if (combat.activeWeaponId === target.id) return;

          pendingWeaponId.current = target.id;
          swapEndsAt.current = performance.now() / 1000 + WEAPON_SWAP_SECONDS;
          combat.setSwapping(true);
        },
      ),
    );

    return () => unsubscribes.forEach((off) => off());
  }, [subscribeKeys]);

  useFrame(() => {
    const target = pendingWeaponId.current;
    if (!target) return;
    if (performance.now() / 1000 < swapEndsAt.current) return;

    pendingWeaponId.current = null;
    const weapon = findWeapon(target);

    useCombatStore.getState().swapTo({
      weaponId: weapon.id,
      magazineSize: weapon.magazineSize,
      defaultReserve: defaultReserveFor(weapon),
    });

    // Senjata yang dipegang ikut tercatat di petarung, supaya kill feed dan
    // HUD menyebut senjata yang benar, dan di loadout supaya pilihan ini
    // terbawa saat pemain kembali ke halaman Pilih Senjata.
    const match = useMatchStore.getState();
    const local = match.fighters.find((fighter) => fighter.isLocal);
    if (local) match.setFighterWeapon(local.id, weapon.id);
    useLoadoutStore.getState().selectWeapon(weapon.id);
  });

  return null;
}
