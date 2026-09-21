"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  NO_SHAKE,
  addShake,
  isShaking,
  shakeFor,
  shakeOffset,
  stepShake,
  type ShakeState,
} from "@/lib/game/camera-shake";
import {
  currentEffectCursor,
  readCombatEffects,
} from "@/lib/game/combat-effects";

/** Batas delta agar jeda tab tidak melompati seluruh guncangan sekaligus. */
const MAX_DELTA = 1 / 20;

/**
 * Menggoyang pandangan saat pemain kena tembak.
 *
 * Simpangannya diterapkan sebagai SELISIH terhadap simpangan frame sebelumnya,
 * bukan sebagai nilai mutlak. Arah pandang dikendalikan PointerLockControls
 * yang menulis putaran kamera sendiri; menimpanya dengan nilai mutlak akan
 * membuat gerakan mouse pemain hilang tiap frame, sementara selisih hanya
 * menambahkan goyangan di atas arah yang sedang ia tuju — dan mengembalikannya
 * persis ke tempat semula saat guncangannya habis. Pola yang sama dipakai
 * sentakan senjata.
 *
 * Kejadiannya dibaca dari antrean efek kombat, jadi apa pun yang bisa
 * mengguncang kamera — tembakan yang kena sekarang, ledakan nanti — cukup
 * mengirim kejadian tanpa mengenal komponen ini.
 */
export function CameraShake() {
  const camera = useThree((state) => state.camera);
  const state = useRef<ShakeState>(NO_SHAKE);
  const applied = useRef({ pitch: 0, yaw: 0 });
  const cursor = useRef(currentEffectCursor());

  useFrame((_state, rawDelta) => {
    const bacaan = readCombatEffects(cursor.current);
    cursor.current = bacaan.cursor;
    for (const event of bacaan.events) {
      if (event.kind !== "getar") continue;
      state.current = addShake(
        state.current,
        // Fase diambil dari jam halaman: dua guncangan berurutan karena itu
        // tidak pernah bergetar persis sama.
        shakeFor(event.strength, performance.now() / 97),
      );
    }

    const delta = Math.min(rawDelta, MAX_DELTA);
    if (isShaking(state.current)) {
      state.current = stepShake(state.current, delta);
    }

    const target = isShaking(state.current)
      ? shakeOffset(state.current)
      : { pitch: 0, yaw: 0 };

    const dPitch = target.pitch - applied.current.pitch;
    const dYaw = target.yaw - applied.current.yaw;
    if (Math.abs(dPitch) > 1e-6 || Math.abs(dYaw) > 1e-6) {
      camera.rotateX(dPitch);
      camera.rotateY(dYaw);
      applied.current = target;
    }
  });

  return null;
}
