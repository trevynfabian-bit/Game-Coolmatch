"use client";

import { useEffect } from "react";
import { mostlyArmor, popMs, popScale } from "@/lib/game/damage-pop";
import { useCombatStore, type DamagePop } from "@/lib/store/combat-store";

/**
 * Satu angka kerusakan.
 *
 * Ukuran dan umurnya mengikuti besarnya: serempetan dua belas dan tembakan
 * sniper seratus sepuluh adalah dua keputusan yang berbeda, dan angka yang
 * selalu sama besar menyembunyikan bedanya. Warnanya mengabarkan apa yang
 * terjadi — kuning untuk kepala, merah untuk yang menumbangkan, biru redup
 * bila sebagian besar ditahan rompi sehingga nyawa lawan hampir tidak
 * berkurang.
 */
function Pop({ pop }: { pop: DamagePop }) {
  const removeDamagePop = useCombatStore((state) => state.removeDamagePop);
  const ms = popMs(pop.amount);

  useEffect(() => {
    // Ikut disetel ulang tiap kali angkanya bertambah, jadi angka yang terus
    // ditambah tidak pernah hilang di tengah rentetan.
    const id = setTimeout(() => removeDamagePop(pop.id), ms);
    return () => clearTimeout(id);
  }, [pop.id, pop.bump, ms, removeDamagePop]);

  const color = pop.isLethal
    ? "text-rose-300"
    : pop.isHeadshot
      ? "text-amber-300"
      : mostlyArmor(pop)
        ? "text-sky-200/80"
        : "text-slate-100";

  return (
    <span
      // Kunci ikut memuat penambahannya: angka yang bertambah memulai ulang
      // animasinya, sehingga penambahan terlihat sebagai "kena lagi" alih-alih
      // angka yang diam-diam berubah.
      key={`${pop.id}:${pop.bump}`}
      data-damage={pop.amount}
      data-jenis={
        pop.isLethal
          ? "tumbang"
          : pop.isHeadshot
            ? "kepala"
            : mostlyArmor(pop)
              ? "rompi"
              : "badan"
      }
      className={`absolute font-mono font-bold tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${color}`}
      style={{
        left: `calc(50% + ${pop.offsetX}px)`,
        top: `calc(50% + ${pop.offsetY}px)`,
        fontSize: `${popScale(pop.amount)}rem`,
        animation: `damage-pop ${ms}ms ease-out forwards`,
      }}
    >
      {pop.amount}
      {pop.isHeadshot ? (
        <span className="ml-0.5 align-super text-[9px] tracking-wider">HS</span>
      ) : null}
      {pop.isLethal ? (
        <span className="ml-1 align-super text-[9px] tracking-wider">
          TUMBANG
        </span>
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
        <Pop key={`${pop.id}:${pop.bump}`} pop={pop} />
      ))}
    </div>
  );
}
