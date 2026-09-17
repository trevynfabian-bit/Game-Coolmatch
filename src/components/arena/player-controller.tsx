"use client";

import { useEffect, useMemo, useRef } from "react";
import { PointerLockControls, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { buildColliders, movePlayer } from "@/lib/game/collision";
import { pointerSpeed } from "@/lib/game/settings";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { PlayerPosition } from "@/lib/game/collision";
import {
  EYE_HEIGHT,
  HINT_AUTO_SHOW_MS,
  MOVEMENT,
  PLAYER_BOUNDS,
  type MoveAction,
} from "@/lib/game/controls";
import { playerRuntime } from "@/lib/game/player-runtime";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { ArenaMapInfo, Vec3 } from "@/types/game";

/** Batas delta time supaya jeda tab tidak melempar pemain menembus dinding. */
const MAX_DELTA = 1 / 30;

/**
 * Kontrol gerak dan lihat sekitar untuk pemain lokal.
 *
 * - Arah pandang ditangani PointerLockControls (mouse look bebas, pitch dibatasi).
 * - Gerak WASD dihitung relatif terhadap arah pandang mendatar, lalu diselesaikan
 *   terhadap penghalang peta oleh `movePlayer` sehingga pemain menyusur dinding,
 *   menaiki undakan, dan tidak menembus krat.
 * - Lompat memakai gravitasi tetap; kendali di udara dikurangi agar berbobot.
 *
 * Selama kursor belum dikunci, kamera menjalankan sapuan pandangan pelan sebagai
 * mode pratinjau arena.
 */
export function PlayerController({
  map,
  spawn,
}: {
  map: ArenaMapInfo;
  spawn: Vec3;
}) {
  const camera = useThree((state) => state.camera);
  const [subscribeKeys, getKeys] = useKeyboardControls<MoveAction>();

  const setLocked = usePlayerStore((state) => state.setLocked);
  const speed = pointerSpeed(useSettingsStore((state) => state.controls));
  const setMotion = usePlayerStore((state) => state.setMotion);
  const setHintsVisible = usePlayerStore((state) => state.setHintsVisible);
  const toggleHints = usePlayerStore((state) => state.toggleHints);

  const colliders = useMemo(() => buildColliders(map), [map]);

  const position = useRef<PlayerPosition>({
    x: spawn[0],
    y: spawn[1],
    z: spawn[2],
  });
  const horizontalVelocity = useRef(new Vector3());
  const verticalVelocity = useRef(0);
  const grounded = useRef(true);
  const jumpQueued = useRef(false);
  const bobPhase = useRef(0);
  /** Seberapa jauh kamera merosot saat pemain tumbang, 0..1. */
  const deathSlump = useRef(0);

  // Vektor kerja, dibuat sekali supaya tidak ada alokasi per frame.
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const desired = useRef(new Vector3());
  const lookTarget = useRef(new Vector3());

  // Lompat dibaca dari langganan tombol, bukan polling, supaya ketukan singkat
  // tidak hilang di antara dua frame.
  useEffect(() => {
    return subscribeKeys(
      (state) => state.jump,
      (pressed) => {
        if (pressed) jumpQueued.current = true;
      },
    );
  }, [subscribeKeys]);

  // H membuka-tutup panel petunjuk kontrol kapan saja.
  useEffect(() => {
    return subscribeKeys(
      (state) => state.help,
      (pressed) => {
        if (pressed) toggleHints();
      },
    );
  }, [subscribeKeys, toggleHints]);

  // Petunjuk kontrol muncul sendiri saat pemain pertama kali masuk arena, lalu
  // menghilang supaya tidak mengganggu. Setelah itu H yang mengendalikan.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = usePlayerStore.subscribe((state, previous) => {
      if (!state.isLocked || previous.isLocked || previous.hasEngaged) return;
      setHintsVisible(true);
      timer = setTimeout(() => setHintsVisible(false), HINT_AUTO_SHOW_MS);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [setHintsVisible]);

  // Pemain lokal muncul kembali: pindahkan badan ke titik spawn barunya dan
  // hentikan sisa momentum dari sebelum tumbang.
  useEffect(() => {
    return useMatchStore.subscribe((state, previous) => {
      const now = state.fighters.find((fighter) => fighter.isLocal);
      const before = previous.fighters.find((fighter) => fighter.isLocal);
      if (!now || !before || !now.isAlive || before.isAlive) return;

      position.current = {
        x: now.position[0],
        y: now.position[1],
        z: now.position[2],
      };
      horizontalVelocity.current.set(0, 0, 0);
      verticalVelocity.current = 0;
      deathSlump.current = 0;
      bobPhase.current = 0;
      jumpQueued.current = false;
    });
  }, []);

  // Pemain kembali ke titik spawn kalau peta atau titik spawn berganti.
  useEffect(() => {
    position.current = { x: spawn[0], y: spawn[1], z: spawn[2] };
    horizontalVelocity.current.set(0, 0, 0);
    verticalVelocity.current = 0;
  }, [spawn, map.id]);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_DELTA);
    const locked = usePlayerStore.getState().isLocked;

    if (!locked) {
      // Mode pratinjau: berdiri di titik spawn sambil menyapu pandangan.
      const t = clock.elapsedTime;
      camera.position.set(
        position.current.x,
        position.current.y + EYE_HEIGHT,
        position.current.z,
      );
      lookTarget.current.set(
        Math.sin(t * 0.2) * 5,
        1.25 + Math.sin(t * 0.16) * 0.35,
        Math.cos(t * 0.2) * 2,
      );
      camera.lookAt(lookTarget.current);
      jumpQueued.current = false;
      playerRuntime.planarSpeed = 0;
      playerRuntime.isAirborne = false;
      return;
    }

    const localFighter = useMatchStore
      .getState()
      .fighters.find((fighter) => fighter.isLocal);

    if (localFighter && !localFighter.isAlive) {
      // Tumbang: kendali dibekukan dan kamera merosot ke dekat lantai.
      deathSlump.current = Math.min(1, deathSlump.current + delta * 3.2);
      const drop = deathSlump.current * (EYE_HEIGHT - 0.45);
      camera.position.set(
        position.current.x,
        position.current.y + EYE_HEIGHT - drop,
        position.current.z,
      );
      horizontalVelocity.current.set(0, 0, 0);
      jumpQueued.current = false;
      playerRuntime.planarSpeed = 0;
      playerRuntime.isAirborne = false;
      setMotion({ isSprinting: false, isAirborne: false });
      return;
    }

    deathSlump.current = 0;
    const keys = getKeys();

    // Sumbu gerak relatif arah pandang, diratakan ke bidang XZ.
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    if (forward.current.lengthSq() < 1e-6) {
      forward.current.set(0, 0, -1);
    }
    forward.current.normalize();
    // right = forward x up (Y ke atas): menghadap -Z, kanan jatuh ke +X.
    right.current.set(-forward.current.z, 0, forward.current.x);

    const inputZ = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);
    const inputX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

    desired.current.set(0, 0, 0);
    if (inputZ !== 0) {
      desired.current.addScaledVector(forward.current, inputZ);
    }
    if (inputX !== 0) {
      desired.current.addScaledVector(right.current, inputX);
    }

    const sprinting = keys.sprint && inputZ > 0;
    const speed = sprinting ? MOVEMENT.sprintSpeed : MOVEMENT.walkSpeed;
    if (desired.current.lengthSq() > 0) {
      desired.current.normalize().multiplyScalar(speed);
    }

    // Pemulusan eksponensial: responsif di tanah, jauh lebih lamban di udara,
    // dan hasilnya tidak bergantung pada frame rate.
    const accel = grounded.current ? MOVEMENT.groundAccel : MOVEMENT.airAccel;
    const blend = 1 - Math.exp(-accel * delta);
    horizontalVelocity.current.lerp(desired.current, blend);

    if (jumpQueued.current) {
      jumpQueued.current = false;
      if (grounded.current) {
        verticalVelocity.current = MOVEMENT.jumpVelocity;
        grounded.current = false;
      }
    }

    verticalVelocity.current -= MOVEMENT.gravity * delta;

    const outcome = movePlayer(
      position.current,
      {
        dx: horizontalVelocity.current.x * delta,
        dy: verticalVelocity.current * delta,
        dz: horizontalVelocity.current.z * delta,
      },
      verticalVelocity.current,
      colliders,
      PLAYER_BOUNDS,
      map.playableBounds,
    );

    position.current = outcome.position;
    verticalVelocity.current = outcome.verticalVelocity;
    grounded.current = outcome.grounded;

    // Menabrak dinding: buang kecepatan supaya tidak menempel lalu melesat.
    if (outcome.blocked) {
      horizontalVelocity.current.multiplyScalar(0.4);
    }

    // Ayunan kepala hanya saat benar-benar berjalan di tanah.
    const planarSpeed = Math.hypot(
      horizontalVelocity.current.x,
      horizontalVelocity.current.z,
    );
    let bob = 0;
    if (grounded.current && planarSpeed > 0.4) {
      bobPhase.current +=
        delta * MOVEMENT.bobFrequency * (planarSpeed / MOVEMENT.walkSpeed);
      bob =
        Math.sin(bobPhase.current) *
        MOVEMENT.bobAmplitude *
        Math.min(1, planarSpeed / MOVEMENT.walkSpeed);
    } else {
      bobPhase.current = 0;
    }

    camera.position.set(
      position.current.x,
      position.current.y + EYE_HEIGHT + bob,
      position.current.z,
    );

    // Disalurkan ke sistem senjata lewat objek biasa, bukan state React.
    playerRuntime.planarSpeed = planarSpeed;
    playerRuntime.isAirborne = !grounded.current;
    playerRuntime.position[0] = position.current.x;
    playerRuntime.position[1] = position.current.y;
    playerRuntime.position[2] = position.current.z;

    setMotion({
      isSprinting: sprinting && planarSpeed > 0.5,
      isAirborne: !grounded.current,
    });
  });

  return (
    /*
      Sensitivitas dilanggani, bukan dibaca sekali. Berbeda dengan kualitas
      gambar yang menuntut kanvas dibangun ulang, kecepatan putar hanya sebuah
      pengali — mengubahnya di tengah permainan tidak mengganggu apa pun, dan
      justru begitulah orang menyetelnya: geser sedikit, coba membidik, geser
      lagi.
    */
    <PointerLockControls
      makeDefault
      pointerSpeed={speed}
      onLock={() => setLocked(true)}
      onUnlock={() => setLocked(false)}
    />
  );
}
