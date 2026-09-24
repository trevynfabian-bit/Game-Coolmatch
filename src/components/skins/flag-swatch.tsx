"use client";

import { useId } from "react";
import { SkinPaint } from "@/components/skins/skin-paint";
import type { Skin } from "@/types/economy";

/** Contoh cat skin berbentuk bendera persegi panjang, untuk etalase camo negara. */
export function FlagSwatch({ skin, className }: { skin: Skin; className?: string }) {
  const id = `bendera-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden>
      <defs>
        <SkinPaint id={id} skin={skin} box={{ width: 60, height: 40 }} />
      </defs>
      <rect width="60" height="40" rx="3" fill={`url(#${id})`} />
      <rect width="60" height="40" rx="3" fill="none" stroke="rgba(255,255,255,0.15)" />
    </svg>
  );
}
