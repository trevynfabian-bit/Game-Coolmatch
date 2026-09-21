"use client";

import { useEffect } from "react";
import { HIT_MARKER, type HitMarkerKind } from "@/lib/game/hit-marker";
import { useCombatStore } from "@/lib/store/combat-store";

const TICK = "absolute bg-emerald-300/90 shadow-[0_0_4px_rgba(16,185,129,0.8)]";

/**
 * Crosshair dinamis. Celah tiap sirip dibaca dari custom property CSS
 * `--crosshair-gap` yang ditulis sistem senjata tiap frame, jadi lebarnya
 * benar-benar menggambarkan sebaran peluru saat ini tanpa memicu render ulang
 * React.
 *
 * Saat tembakan mengenai petarung, penanda berkelip di atasnya — dan
 * bentuknya mengabarkan APA yang terjadi: silang kecil kebiruan untuk yang
 * tertahan rompi, silang putih untuk kena badan, silang kuning yang lebih
 * panjang untuk kepala, dan tanda tambah kemerahan yang paling besar untuk
 * lawan yang tumbang. Bentuk yang berbeda terbaca lebih cepat daripada warna
 * yang berbeda, dan penanda inilah satu-satunya umpan balik yang selalu
 * berada tepat di tempat mata pemain sedang menatap.
 */
/**
 * Satu penanda kena. Empat gores disusun dari angka pada tabelnya, jadi
 * menyetel panjang, tebal, atau putarannya cukup dilakukan di satu tempat —
 * bukan dengan menulis ulang jalur SVG-nya.
 */
function Marker({ kind, id }: { kind: HitMarkerKind; id: number }) {
  const style = HIT_MARKER[kind];
  const ukuran = (style.gap + style.arm + style.stroke) * 2;
  const tengah = ukuran / 2;
  const ujung = style.gap + style.arm;

  return (
    <span
      key={id}
      className="absolute"
      data-penanda={kind}
      style={{
        transform: `translate(-50%, -50%) rotate(${style.rotate}deg)`,
        animation: `hit-marker ${style.ms}ms ease-out forwards`,
      }}
      aria-hidden
    >
      <svg width={ukuran} height={ukuran} fill="none">
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sy]) => (
          <path
            key={`${sx}:${sy}`}
            d={`M${tengah + sx * ujung} ${tengah + sy * ujung} L${
              tengah + sx * style.gap
            } ${tengah + sy * style.gap}`}
            stroke={style.color}
            strokeWidth={style.stroke}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </span>
  );
}

export function Crosshair() {
  const hitMarker = useCombatStore((state) => state.hitMarker);
  const clearHitMarker = useCombatStore((state) => state.clearHitMarker);

  useEffect(() => {
    if (!hitMarker) return;
    const ms = HIT_MARKER[hitMarker.kind].ms;
    const id = setTimeout(() => clearHitMarker(hitMarker.id), ms);
    return () => clearTimeout(id);
  }, [hitMarker, clearHitMarker]);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute top-1/2 left-1/2">
        <span
          className={`${TICK} h-0.5 w-2`}
          style={{
            transform:
              "translate(-100%, -50%) translateX(calc(-1 * var(--crosshair-gap)))",
          }}
        />
        <span
          className={`${TICK} h-0.5 w-2`}
          style={{
            transform: "translate(0, -50%) translateX(var(--crosshair-gap))",
          }}
        />
        <span
          className={`${TICK} h-2 w-0.5`}
          style={{
            transform:
              "translate(-50%, -100%) translateY(calc(-1 * var(--crosshair-gap)))",
          }}
        />
        <span
          className={`${TICK} h-2 w-0.5`}
          style={{
            transform: "translate(-50%, 0) translateY(var(--crosshair-gap))",
          }}
        />
        <span
          className="absolute h-0.5 w-0.5 rounded-full bg-emerald-200"
          style={{ transform: "translate(-50%, -50%)" }}
        />

        {hitMarker ? <Marker kind={hitMarker.kind} id={hitMarker.id} /> : null}
      </div>
    </div>
  );
}
