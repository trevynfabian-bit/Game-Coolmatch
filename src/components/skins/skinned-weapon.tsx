"use client";

import { useId } from "react";
import { SkinPaint } from "@/components/skins/skin-paint";
import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import type { Skin } from "@/types/economy";
import type { WeaponType } from "@/types/game";

/** Siluet senjata yang dicat dengan skin; tanpa skin memakai warna teks (cat pabrik). */
export function SkinnedWeapon({
  type,
  skin,
  className,
}: {
  type: WeaponType;
  skin: Skin | null | undefined;
  className?: string;
}) {
  // Id pola harus unik per instance: banyak kartu bisa memakai skin yang sama.
  const id = `skin-${useId().replace(/:/g, "")}`;
  if (!skin) return <WeaponSilhouette type={type} className={className} />;
  return (
    <WeaponSilhouette type={type} className={className} paint={`url(#${id})`}>
      <defs>
        <SkinPaint id={id} skin={skin} />
      </defs>
    </WeaponSilhouette>
  );
}
