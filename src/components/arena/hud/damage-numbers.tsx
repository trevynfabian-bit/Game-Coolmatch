"use client";

import { useEffect } from "react";
import { useCombatStore, type DamagePop } from "@/lib/store/combat-store";

/** Lama angka kerusakan melayang; harus sejalan dengan keyframe damage-pop. */
const POP_MS = 820;

function Pop({ pop }: { pop: DamagePop }) {
  const removeDamagePop = useCombatStore((state) => state.removeDamagePop);

  useEffect(() => {
    const id = setTimeout(() => removeDamagePop(pop.id), POP_MS);
    return () => clearTimeout(id);
  }, [pop.id, removeDamagePop]);

  const color = pop.isLethal
    ? "text-rose-300"
    : pop.isHeadshot
      ? "text-amber-300"
      : "text-slate-100";

  return (
    <span
      className={`absolute font-mono text-lg font-bold tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${color}`}
      style={{
        left: `calc(50% + ${pop.offsetX}px)`,
        top: `calc(50% + ${pop.offsetY}px)`,
        animation: `damage-pop ${POP_MS}ms ease-out forwards`,
      }}
    >
      {pop.amount}
      {pop.isHeadshot ? (
        <span className="ml-0.5 align-super text-[9px] tracking-wider">HS</span>
      ) : null}
    </span>
  );
}

/**
 * Angka kerusakan yang melayang naik di dekat crosshair tiap kali tembakan
 * mengenai lawan. Ditempel di HUD, bukan di dunia 3D, karena pemain sudah
 * menatap crosshair saat menembak dan ini jauh lebih murah daripada menempel
 * elemen DOM pada titik jatuh peluru.
 */
export function DamageNumbers() {
  const damagePops = useCombatStore((state) => state.damagePops);

  if (damagePops.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {damagePops.map((pop) => (
        <Pop key={pop.id} pop={pop} />
      ))}
    </div>
  );
}
