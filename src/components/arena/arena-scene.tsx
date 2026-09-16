"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { ArenaMap } from "@/components/arena/arena-map";
import { FighterMarker } from "@/components/arena/fighter-marker";
import { WeaponViewmodel } from "@/components/arena/weapon-viewmodel";
import { getLocalFighter } from "@/lib/mock/match";
import type { MatchSnapshot } from "@/types/game";

/** Tinggi mata pemain dari lantai, dipakai untuk menempatkan kamera. */
const EYE_HEIGHT = 1.7;

/**
 * Menempatkan kamera di posisi pemain lokal dan memberi ayunan idle halus.
 * Belum ada input apa pun di sini — kontrol gerak & bidik adalah task terpisah.
 */
function ArenaCamera({ match }: { match: MatchSnapshot }) {
  const camera = useThree((state) => state.camera);
  const lookTarget = useRef(new Vector3(0, 1.4, 0));
  const local = getLocalFighter(match);
  const [baseX, baseY, baseZ] = local.position;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    camera.position.set(
      baseX + Math.sin(t * 0.45) * 0.06,
      baseY + EYE_HEIGHT + Math.sin(t * 1.1) * 0.022,
      baseZ + Math.sin(t * 0.3) * 0.04,
    );
    // Sapuan pandangan pelan melintasi arena, seperti pemain yang sedang
    // mengamati sekitar sebelum kontrol bidik dipasang.
    lookTarget.current.set(
      Math.sin(t * 0.2) * 5,
      1.25 + Math.sin(t * 0.16) * 0.35,
      Math.cos(t * 0.2) * 2,
    );
    camera.lookAt(lookTarget.current);
  });

  return null;
}

/** Pencahayaan arena: matahari senja yang menghasilkan bayangan + isian lembut. */
function ArenaLights() {
  return (
    <>
      <hemisphereLight args={["#9db4d2", "#3a332b", 1.15]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[18, 26, 10]}
        intensity={1.9}
        color="#ffd9ad"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={70}
      />
      <directionalLight
        position={[-14, 10, -12]}
        intensity={0.5}
        color="#7aa2d6"
      />
    </>
  );
}

/**
 * Kanvas 3D arena. Seluruh isinya digambar dari `MatchSnapshot` yang dioper,
 * jadi saat data tiruan diganti respons API nanti, komponen ini tidak berubah.
 */
export function ArenaScene({ match }: { match: MatchSnapshot }) {
  const local = getLocalFighter(match);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 75, near: 0.1, far: 220, position: [0, EYE_HEIGHT, 14] }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[match.map.skyColor]} />
      <fog attach="fog" args={[match.map.fogColor, 34, 110]} />

      <ArenaLights />
      <ArenaCamera match={match} />
      <ArenaMap map={match.map} />

      {match.fighters
        .filter((fighter) => !fighter.isLocal)
        .map((fighter) => (
          <FighterMarker key={fighter.id} fighter={fighter} />
        ))}

      <WeaponViewmodel color={local.color === "#38bdf8" ? "#2b3138" : local.color} />
    </Canvas>
  );
}
