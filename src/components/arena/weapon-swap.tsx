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
import { swapBottomAt } from "@/lib/game/swap-anim";
import { unlockedWeapons } from "@/lib/mock/player-weapons";
import { weaponRuntime } from "@/lib/game/weapon-runtime";
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
  /** Jam saat senjatanya benar-benar bertukar: titik terendah animasinya. */
  const swapAtBottom = useRef(0);

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
          const mulai = performance.now() / 1000;
          swapEndsAt.current = mulai + WEAPON_SWAP_SECONDS;
          // Senjatanya bertukar di titik TERENDAH animasinya, bukan di
          // ujungnya; lihat swap-anim.
          swapAtBottom.current = swapBottomAt(mulai, WEAPON_SWAP_SECONDS);
          // Jam yang sama dipakai animasi senjata; lihat weapon-runtime.
          weaponRuntime.swapEndsAt = swapEndsAt.current;
          weaponRuntime.swapSeconds = WEAPON_SWAP_SECONDS;
          combat.setSwapping(true);
        },
      ),
    );

    return () => unsubscribes.forEach((off) => off());
  }, [subscribeKeys]);

  useFrame(() => {
    const now = performance.now() / 1000;
    const target = pendingWeaponId.current;

    if (target && now >= swapAtBottom.current) {
      /*
        Senjatanya bertukar DI TITIK TERENDAH, saat ia di luar pandangan.
        Dengan begitu yang turun adalah senjata lama dan yang naik adalah
        senjata baru — bukan satu senjata yang turun, naik lagi utuh, lalu
        berubah bentuk di tangan pemain.
      */
      pendingWeaponId.current = null;
      const weapon = findWeapon(target);
      const combat = useCombatStore.getState();

      combat.swapTo({
        weaponId: weapon.id,
        magazineSize: weapon.magazineSize,
        defaultReserve: defaultReserveFor(weapon),
      });
      /*
        Pelatuk tetap terkunci sampai senjata baru benar-benar terangkat.
        swapTo membuka kuncinya karena bagi store pergantiannya memang sudah
        selesai; yang belum selesai adalah tangan pemain.
      */
      useCombatStore.getState().setSwapping(true);

      // Senjata yang dipegang ikut tercatat di petarung, supaya kill feed dan
      // HUD menyebut senjata yang benar, dan di loadout supaya pilihan ini
      // terbawa saat pemain kembali ke halaman Pilih Senjata.
      const match = useMatchStore.getState();
      const local = match.fighters.find((fighter) => fighter.isLocal);
      if (local) match.setFighterWeapon(local.id, weapon.id);
      useLoadoutStore.getState().selectWeapon(weapon.id);
      return;
    }

    // Kunci pelatuk dilepas saat senjata barunya sudah sampai di pandangan.
    if (!target && swapEndsAt.current > 0 && now >= swapEndsAt.current) {
      swapEndsAt.current = 0;
      swapAtBottom.current = 0;
      useCombatStore.getState().setSwapping(false);
    }
  });

  return null;
}
