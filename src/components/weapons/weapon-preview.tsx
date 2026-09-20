"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { WeaponMesh } from "@/components/weapons/weapon-mesh";
import type { Weapon } from "@/types/game";

/** Pratinjau yang berputar pelan supaya bentuknya terbaca dari beberapa sisi. */
function WeaponModel({ weapon }: { weapon: Weapon }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y = clock.elapsedTime * 0.5;
    group.rotation.x = Math.sin(clock.elapsedTime * 0.35) * 0.12;
  });

  return (
    <group ref={groupRef}>
      <WeaponMesh weapon={weapon} />
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
