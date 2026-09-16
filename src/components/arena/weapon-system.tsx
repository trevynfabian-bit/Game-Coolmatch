"use client";

import { useEffect, useMemo, useRef } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import {
  ShotEffects,
  type ShotEffectsHandle,
} from "@/components/arena/shot-effects";
import { buildColliders } from "@/lib/game/collision";
import { type MoveAction } from "@/lib/game/controls";
import { playerRuntime } from "@/lib/game/player-runtime";
import {
  MAX_BLOOM_DEGREES,
  MAX_SHOT_DISTANCE,
  applySpread,
  buildFighterTargets,
  effectiveSpread,
  raycastArena,
  shotInterval,
} from "@/lib/game/shooting";
import { useCombatStore } from "@/lib/store/combat-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { MatchSnapshot, Vec3, Weapon } from "@/types/game";

/** Seberapa cepat sentakan kamera pulih ke posisi bidik semula, per detik. */
const RECOIL_RECOVERY = 7.5;
/** Seberapa cepat mekar akibat tembakan beruntun mereda, per detik. */
const BLOOM_DECAY = 3.4;
/** Tambahan mekar tiap kali pelatuk ditarik, dalam derajat. */
const BLOOM_PER_SHOT = 0.85;
/** Batas atas celah crosshair di layar, dalam piksel. */
const MAX_CROSSHAIR_GAP = 90;

/**
 * Menerjemahkan sudut sebaran menjadi celah crosshair dalam piksel, memakai
 * proyeksi perspektif yang sama dengan kamera. Hasilnya crosshair benar-benar
 * menggambarkan seberapa lebar peluru bisa jatuh, bukan angka karangan.
 */
function spreadToPixels(
  spreadDegrees: number,
  fovDegrees: number,
  viewportHeight: number,
): number {
  const halfFov = MathUtils.degToRad(fovDegrees) / 2;
  const ratio = Math.tan(MathUtils.degToRad(spreadDegrees)) / Math.tan(halfFov);
  return Math.min((viewportHeight / 2) * ratio, MAX_CROSSHAIR_GAP);
}

/**
 * Mekanik menembak pemain lokal: penjadwalan laju tembak, sebaran, hitscan ke
 * arena, sentakan kamera, amunisi, dan isi ulang. Efek visual diserahkan ke
 * `ShotEffects` lewat ref imperatif supaya menembak beruntun tidak memicu
 * render ulang React.
 *
 * Kerusakan pada petarung belum diterapkan di sini — tembakan yang kena
 * dilaporkan lewat `onFighterHit` supaya task nyawa & respawn tinggal
 * menyambungkannya.
 */
export function WeaponSystem({
  match,
  weapon,
  onFighterHit,
}: {
  match: MatchSnapshot;
  weapon: Weapon;
  onFighterHit?: (hit: {
    fighterId: string;
    isHeadshot: boolean;
    damage: number;
  }) => void;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const [subscribeKeys] = useKeyboardControls<MoveAction>();
  const effects = useRef<ShotEffectsHandle>(null);

  const colliders = useMemo(() => buildColliders(match.map), [match.map]);
  const targets = useMemo(
    () => buildFighterTargets(match.fighters),
    [match.fighters],
  );

  const triggerHeld = useRef(false);
  const triggerConsumed = useRef(false);
  const nextShotAt = useRef(0);
  const bloom = useRef(0);
  const recoil = useRef(0);
  const appliedRecoil = useRef(0);
  const reloadEndsAt = useRef(0);
  const lastGapPx = useRef(-1);

  const origin = useMemo(() => new Vector3(), []);
  const forward = useMemo(() => new Vector3(), []);
  const muzzle = useMemo(() => new Vector3(), []);

  // Amunisi awal diambil dari potret pertandingan, lalu dikelola combat store.
  useEffect(() => {
    useCombatStore.getState().arm({
      ammoInMagazine: match.ammoInMagazine,
      ammoReserve: match.ammoReserve,
      magazineSize: weapon.magazineSize,
    });
  }, [match.ammoInMagazine, match.ammoReserve, weapon.magazineSize]);

  // Pelatuk. Klik pertama yang mengunci kursor sengaja diabaikan karena saat
  // mousedown itu terjadi pointer lock belum aktif.
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (!usePlayerStore.getState().isLocked) return;
      triggerHeld.current = true;
      triggerConsumed.current = false;
    };
    const onUp = (event: MouseEvent) => {
      if (event.button !== 0) return;
      triggerHeld.current = false;
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Kursor dilepas: lepaskan pelatuk supaya tidak menembak terus di balik jeda.
  useEffect(
    () =>
      usePlayerStore.subscribe((state) => {
        if (!state.isLocked) triggerHeld.current = false;
      }),
    [],
  );

  useEffect(
    () =>
      subscribeKeys(
        (state) => state.reload,
        (pressed) => {
          if (!pressed || !usePlayerStore.getState().isLocked) return;
          useCombatStore.getState().beginReload(weapon.reloadSeconds);
        },
      ),
    [subscribeKeys, weapon.reloadSeconds],
  );

  // Isi ulang berjalan lewat jam frame, bukan setTimeout, supaya berhenti ikut
  // berhenti saat tab tidak aktif dan tidak pernah selesai di latar belakang.
  useEffect(() => {
    return useCombatStore.subscribe((state, previous) => {
      if (state.isReloading && !previous.isReloading) {
        reloadEndsAt.current = performance.now() / 1000 + state.reloadSeconds;
      }
    });
  }, []);

  const fireOnce = () => {
    const combat = useCombatStore.getState();
    if (!combat.consumeRound()) {
      combat.beginReload(weapon.reloadSeconds);
      return;
    }

    camera.getWorldDirection(forward);
    origin.copy(camera.position);

    // Tracer berangkat dari moncong, bukan dari mata, supaya garisnya terlihat
    // keluar dari senjata di layar.
    muzzle
      .copy(camera.position)
      .addScaledVector(forward, 1.35)
      .addScaledVector(
        new Vector3().crossVectors(forward, camera.up).normalize(),
        0.28,
      )
      .addScaledVector(camera.up, -0.18);

    const spread = effectiveSpread({
      weapon,
      planarSpeed: playerRuntime.planarSpeed,
      isAirborne: playerRuntime.isAirborne,
      bloom: bloom.current,
    });

    const base: Vec3 = [forward.x, forward.y, forward.z];
    const originVec: Vec3 = [origin.x, origin.y, origin.z];
    let bestHitOnFighter: { fighterId: string; isHeadshot: boolean } | null =
      null;

    for (let pellet = 0; pellet < weapon.pellets; pellet++) {
      const direction = applySpread(base, spread);
      const hit = raycastArena(originVec, direction, colliders, targets);

      const end: Vec3 = hit
        ? hit.point
        : [
            originVec[0] + direction[0] * MAX_SHOT_DISTANCE,
            originVec[1] + direction[1] * MAX_SHOT_DISTANCE,
            originVec[2] + direction[2] * MAX_SHOT_DISTANCE,
          ];

      effects.current?.spawnTracer([muzzle.x, muzzle.y, muzzle.z], end);

      if (hit) {
        effects.current?.spawnImpact(hit.point, hit.kind === "fighter");
        if (hit.kind === "fighter" && hit.fighterId) {
          const isHeadshot = hit.isHeadshot ?? false;
          onFighterHit?.({
            fighterId: hit.fighterId,
            isHeadshot,
            damage: isHeadshot ? weapon.damage * 2 : weapon.damage,
          });
          // Satu penanda kena per tarikan pelatuk; headshot menang.
          if (!bestHitOnFighter || isHeadshot) {
            bestHitOnFighter = { fighterId: hit.fighterId, isHeadshot };
          }
        }
      }
    }

    if (bestHitOnFighter) {
      useCombatStore.getState().registerHit(bestHitOnFighter.isHeadshot);
    }

    effects.current?.flashMuzzle();
    recoil.current += weapon.recoilDegrees;
    bloom.current = Math.min(
      MAX_BLOOM_DEGREES,
      bloom.current + BLOOM_PER_SHOT,
    );
  };

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const now = performance.now() / 1000;
    const locked = usePlayerStore.getState().isLocked;
    const combat = useCombatStore.getState();

    if (combat.isReloading && now >= reloadEndsAt.current) {
      combat.finishReload();
    }

    if (locked && !combat.isReloading) {
      const canPull = weapon.automatic
        ? triggerHeld.current
        : triggerHeld.current && !triggerConsumed.current;

      if (canPull && now >= nextShotAt.current) {
        triggerConsumed.current = true;
        nextShotAt.current = now + shotInterval(weapon);
        fireOnce();
      }
    }

    // Sentakan diterapkan sebagai selisih supaya arah bidik kembali persis ke
    // tempat semula ketika pemain tidak menggerakkan mouse.
    recoil.current *= Math.exp(-RECOIL_RECOVERY * delta);
    const recoilDelta = recoil.current - appliedRecoil.current;
    if (Math.abs(recoilDelta) > 1e-5) {
      camera.rotateX(MathUtils.degToRad(recoilDelta));
      appliedRecoil.current = recoil.current;
    }

    bloom.current *= Math.exp(-BLOOM_DECAY * delta);

    // Celah crosshair ditulis langsung sebagai custom property CSS: nilai ini
    // berubah tiap frame dan tidak boleh lewat state React.
    const spread = locked
      ? effectiveSpread({
          weapon,
          planarSpeed: playerRuntime.planarSpeed,
          isAirborne: playerRuntime.isAirborne,
          bloom: bloom.current,
        })
      : weapon.spreadDegrees;

    // Kamera arena selalu perspektif; cabang lain hanya menjaga tipe tetap aman.
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 75;
    const gapPx = spreadToPixels(spread, fov, size.height);
    if (Math.abs(gapPx - lastGapPx.current) > 0.25) {
      lastGapPx.current = gapPx;
      document.documentElement.style.setProperty(
        "--crosshair-gap",
        `${gapPx.toFixed(1)}px`,
      );
    }
  });

  return <ShotEffects ref={effects} />;
}
