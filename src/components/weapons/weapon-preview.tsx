"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { WEAPON_SHAPES } from "@/lib/weapons/weapon-shape";
import { skinFinish, skinTexture } from "@/lib/skins/skin-texture";
import type { Skin } from "@/types/economy";
import type { Weapon } from "@/types/game";

/**
 * Model senjata low-poly yang dirakit dari proporsi per jenis.
 *
 * Dengan `skin`, badan, laras, magasin, dan popor dicat tekstur skin; tanpa
 * skin memakai cat pabrik. `spin` memutar model pelan dengan sendirinya —
 * dimatikan di mode inspect, tempat pemain memutarnya sendiri.
 */
export function WeaponModel({
  weapon,
  skin,
  spin = true,
}: {
  weapon: Weapon;
  skin?: Skin | null;
  spin?: boolean;
}) {
  const shape = WEAPON_SHAPES[weapon.type];
  const groupRef = useRef<Group>(null);
  const texture = useMemo(() => (skin ? skinTexture(skin) : null), [skin]);
  const finish = skinFinish(skin);
  /** Material bagian yang ikut dicat skin. */
  const painted = (factory: string) =>
    texture ? (
      <meshStandardMaterial map={texture} roughness={finish.roughness} metalness={finish.metalness} />
    ) : (
      <meshStandardMaterial color={factory} roughness={0.45} metalness={0.5} />
    );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group || !spin) return;
    // Berputar pelan supaya bentuknya terbaca dari beberapa sisi.
    group.rotation.y = clock.elapsedTime * 0.5;
    group.rotation.x = Math.sin(clock.elapsedTime * 0.35) * 0.12;
  });

  const bodyZ = 0;
  const barrelZ = -(shape.bodyLength / 2 + shape.barrelLength / 2);

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, bodyZ]} castShadow>
        <boxGeometry args={[shape.bodyHeight * 0.8, shape.bodyHeight, shape.bodyLength]} />
        {painted("#5a6675")}
      </mesh>

      <mesh position={[0, 0, barrelZ]} castShadow>
        <boxGeometry
          args={[shape.barrelThickness, shape.barrelThickness, shape.barrelLength]}
        />
        {painted("#39434f")}
      </mesh>

      {shape.magazineDepth > 0 ? (
        <mesh
          position={[0, -shape.bodyHeight / 2 - shape.magazineDepth / 2 + 0.02, 0.02]}
          rotation={[0.16, 0, 0]}
          castShadow
        >
          <boxGeometry
            args={[shape.bodyHeight * 0.6, shape.magazineDepth, shape.bodyLength * 0.2]}
          />
          {painted("#454f5c")}
        </mesh>
      ) : null}

      <mesh
        position={[0, -shape.bodyHeight / 2 - 0.09, shape.bodyLength * 0.3]}
        rotation={[-0.34, 0, 0]}
        castShadow
      >
        <boxGeometry args={[shape.bodyHeight * 0.55, 0.2, shape.bodyLength * 0.14]} />
        <meshStandardMaterial color="#7a6145" roughness={0.8} metalness={0.05} />
      </mesh>

      {shape.hasStock ? (
        <mesh
          position={[0, -0.01, shape.bodyLength / 2 + 0.11]}
          castShadow
        >
          <boxGeometry args={[shape.bodyHeight * 0.65, shape.bodyHeight * 0.9, 0.22]} />
          {texture ? painted("#7a6145") : <meshStandardMaterial color="#7a6145" roughness={0.8} metalness={0.05} />}
        </mesh>
      ) : null}

      {shape.hasScope ? (
        <mesh position={[0, shape.bodyHeight / 2 + 0.06, -0.05]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.3, 12]} />
          <meshStandardMaterial color="#323b47" roughness={0.3} metalness={0.7} />
        </mesh>
      ) : null}

      <mesh position={[0, shape.bodyHeight / 2 + 0.03, shape.bodyLength * 0.18]}>
        <boxGeometry args={[0.03, 0.045, 0.1]} />
        <meshStandardMaterial
          color={shape.accent}
          emissive={shape.accent}
          emissiveIntensity={0.55}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function PreviewCanvas({ weapon }: { weapon: Weapon }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 38, position: [0, 0.35, 2.1] }}
      gl={{ antialias: true, alpha: true }}
    >
      <hemisphereLight args={["#9db4d2", "#2a2520", 1.1]} />
      <directionalLight position={[3, 4, 3]} intensity={2.1} color="#ffd9ad" />
      <directionalLight position={[-3, 1, -2]} intensity={0.9} color="#7aa2d6" />
      <directionalLight position={[0, -3, 1]} intensity={0.45} color="#b6c6da" />
      <WeaponModel weapon={weapon} />
    </Canvas>
  );
}

/** Kanvas 3D butuh WebGL, jadi hanya dimuat di browser. */
const LazyPreview = dynamic(() => Promise.resolve(PreviewCanvas), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400"
        role="status"
        aria-label="Memuat pratinjau senjata"
      />
    </div>
  ),
});

/**
 * Pratinjau 3D senjata yang sedang dipilih. Hanya satu kanvas untuk seluruh
 * halaman — kartu daftar memakai siluet SVG yang jauh lebih murah.
 */
export function WeaponPreview({ weapon }: { weapon: Weapon }) {
  return (
    <div className="h-56 w-full sm:h-72">
      <LazyPreview weapon={weapon} />
    </div>
  );
}
