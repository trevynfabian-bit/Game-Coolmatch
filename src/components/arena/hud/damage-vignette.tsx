"use client";

import { useEffect } from "react";
import { useCombatStore, type IncomingHit } from "@/lib/store/combat-store";
import type { Fighter } from "@/types/game";

/** Lama kilat merah setiap kali pemain kena, dalam milidetik. */
const FLASH_MS = 520;
/** Lama penunjuk arah penyerang bertahan di layar. */
const ARC_MS = 1400;
/** Ambang nyawa yang memicu denyut merah permanen. */
const CRITICAL_HEALTH = 30;

const RED_EDGE =
  "radial-gradient(ellipse at center, transparent 42%, rgba(190,18,60,0.55) 82%, rgba(136,10,42,0.9) 100%)";

/**
 * Kilat merah sekali jalan; elemennya di-remount lewat key tiap kena. Murni
 * visual — penghapusan entri diserahkan ke DirectionArc yang berumur lebih
 * panjang, supaya busurnya tidak ikut tercabut lebih awal.
 */
function Flash({ hit }: { hit: IncomingHit }) {
  return (
    <span
      className="absolute inset-0"
      style={{
        background: RED_EDGE,
        // Tembakan berat memerahkan layar lebih pekat daripada serempetan.
        ["--flash-peak" as string]: `${0.35 + hit.severity * 0.6}`,
        animation: `damage-flash ${FLASH_MS}ms ease-out forwards`,
      }}
    />
  );
}

/**
 * Busur penunjuk arah penyerang. Diputar sesuai sudut penyerang terhadap arah
 * pandang, jadi pemain tahu harus menoleh ke mana.
 */
function DirectionArc({ hit }: { hit: IncomingHit }) {
  const removeIncomingHit = useCombatStore((state) => state.removeIncomingHit);

  useEffect(() => {
    const id = setTimeout(() => removeIncomingHit(hit.id), ARC_MS);
    return () => clearTimeout(id);
  }, [hit.id, removeIncomingHit]);

  return (
    <span
      className="absolute top-1/2 left-1/2"
      style={{
        transform: `translate(-50%, -50%) rotate(${hit.angleRad}rad)`,
        animation: `damage-arc ${ARC_MS}ms ease-out forwards`,
      }}
      aria-hidden
    >
      <svg width="190" height="190" viewBox="0 0 190 190" fill="none">
        {/* Busur digambar di sisi atas lalu ikut diputar oleh transform induk. */}
        <path
          d="M 60 34 A 78 78 0 0 1 130 34"
          stroke="#fb7185"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.95"
        />
      </svg>
    </span>
  );
}

/**
 * Umpan balik layar penuh saat pemain kena tembak: kilat merah di tepi layar,
 * busur penunjuk arah penyerang, dan denyut merah tetap selama nyawa kritis.
 */
export function DamageVignette({ fighter }: { fighter: Fighter }) {
  const incomingHits = useCombatStore((state) => state.incomingHits);

  const critical = fighter.isAlive && fighter.health <= CRITICAL_HEALTH;
  const newest = incomingHits[incomingHits.length - 1];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {critical ? (
        <span
          className="absolute inset-0"
          style={{
            background: RED_EDGE,
            animation: "low-health-pulse 1.6s ease-in-out infinite",
          }}
          aria-hidden
        />
      ) : null}

      {newest ? <Flash key={newest.id} hit={newest} /> : null}

      {incomingHits.map((hit) => (
        <DirectionArc key={hit.id} hit={hit} />
      ))}

      {!fighter.isAlive ? (
        <span
          className="absolute inset-0 bg-slate-950/55"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
