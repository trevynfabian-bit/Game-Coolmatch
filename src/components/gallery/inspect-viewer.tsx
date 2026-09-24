"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { WeaponModel } from "@/components/weapons/weapon-preview";
import { RARITY_META } from "@/lib/economy/skin-catalog";
import type { Skin } from "@/types/economy";
import type { Weapon } from "@/types/game";

function InspectCanvas({ weapon, skin }: { weapon: Weapon; skin: Skin | null }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 32, position: [1.6, 0.4, 1.6] }} gl={{ antialias: true, alpha: true }}>
      <hemisphereLight args={["#c7d7ec", "#2a2520", 1.1]} />
      <directionalLight position={[3, 4, 3]} intensity={2.4} color="#fff1dc" />
      <directionalLight position={[-3, 1, -2]} intensity={1} color="#8fb3e0" />
      <directionalLight position={[0, -3, 1]} intensity={0.5} color="#b6c6da" />
      <WeaponModel weapon={weapon} skin={skin} spin={false} />
      {/* Putar dengan seret, zoom dengan gulir/cubit; berputar pelan sendiri saat didiamkan. */}
      <OrbitControls
        enablePan={false}
        minDistance={0.9}
        maxDistance={4}
        autoRotate
        autoRotateSpeed={0.8}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}

const LazyInspectCanvas = dynamic(() => Promise.resolve(InspectCanvas), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" role="status" aria-label="Memuat model senjata" />
    </div>
  ),
});

/**
 * Mode inspect ala CS:GO: senjata dengan skinnya tampil besar di tengah layar.
 * Seret untuk memutar, gulir untuk mendekat atau menjauh; bila didiamkan,
 * model berputar pelan sendiri. Esc atau tombol tutup mengakhiri inspect.
 */
export function InspectViewer({
  weapon,
  skin,
  onClose,
}: {
  weapon: Weapon;
  skin: Skin | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accent = skin ? RARITY_META[skin.rarity].color : "#94a3b8";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Inspect ${weapon.name}`}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: accent }}>
            Inspect{skin ? ` · ${RARITY_META[skin.rarity].label}` : ""}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">
            {weapon.name}
            <span className="text-slate-500"> | </span>
            <span style={{ color: accent }}>{skin?.name ?? "Cat pabrik"}</span>
          </h2>
          {skin ? <p className="mt-1 max-w-md text-sm text-slate-400">{skin.description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/30"
        >
          Tutup
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 cursor-grab active:cursor-grabbing"
        style={{ background: `radial-gradient(circle at 50% 55%, ${accent}22, transparent 60%)` }}
      >
        <LazyInspectCanvas weapon={weapon} skin={skin} />
      </div>

      <p className="pb-6 text-center text-xs text-slate-500">
        Seret untuk memutar · gulir untuk zoom · Esc untuk keluar
      </p>
    </div>
  );
}
