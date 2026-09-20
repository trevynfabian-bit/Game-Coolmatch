"use client";

import { useEffect, useRef } from "react";
import { livePosition } from "@/lib/game/bot-runtime";
import { incomingAngle } from "@/lib/game/incoming-fire";
import { playerRuntime } from "@/lib/game/player-runtime";
import { useCombatStore, type IncomingHit } from "@/lib/store/combat-store";
import { useMatchStore } from "@/lib/store/match-store";
import type { Fighter } from "@/types/game";

/** Lama kilat merah setiap kali pemain kena, dalam milidetik. */
const FLASH_MS = 520;
/** Lama penunjuk arah penyerang bertahan di layar. */
const ARC_MS = 1400;
/** Jari-jari busur dan jarak label nama dari tengah layar, dalam piksel. */
const ARC_RADIUS = 78;
const LABEL_RADIUS = 122;
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
 * Sudut penembak relatif arah pandang pemain SAAT INI. Penembak dicari di
 * roster dan posisinya dibaca dari runtime — tempat ia berdiri sekarang, bukan
 * saat menembak — sehingga busur terus menunjuk ke orangnya walau pemain
 * menoleh atau penembaknya berpindah. Bila penembaknya sudah tidak ada,
 * sudut saat kena dipakai apa adanya.
 */
function angleToAttacker(hit: IncomingHit): number {
  const attacker = useMatchStore
    .getState()
    .fighters.find((fighter) => fighter.id === hit.attackerId);
  if (!attacker) return hit.angleRad;
  const shooter = livePosition(attacker);
  return incomingAngle(
    playerRuntime.facingYaw,
    [playerRuntime.position[0], 0, playerRuntime.position[2]],
    [shooter[0], 0, shooter[2]],
  );
}

/**
 * Busur penunjuk arah penyerang beserta namanya. Sudutnya ditulis langsung ke
 * DOM tiap frame lewat requestAnimationFrame, bukan lewat state React: busur
 * yang menunjuk ke penembak harus ikut berputar saat pemain menoleh, dan
 * menoleh terjadi tiap frame. Label nama diputar balik supaya tetap tegak.
 */
function DirectionArc({ hit }: { hit: IncomingHit }) {
  const removeIncomingHit = useCombatStore((state) => state.removeIncomingHit);
  const arc = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = setTimeout(() => removeIncomingHit(hit.id), ARC_MS);
    return () => clearTimeout(id);
  }, [hit.id, removeIncomingHit]);

  useEffect(() => {
    let frame = 0;
    const ikuti = () => {
      const angle = angleToAttacker(hit);
      if (arc.current) {
        arc.current.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
        arc.current.dataset.sudut = angle.toFixed(3);
      }
      if (label.current) {
        label.current.style.transform = `translate(-50%, -50%) rotate(${angle}rad) translateY(${-LABEL_RADIUS}px) rotate(${-angle}rad)`;
      }
      frame = requestAnimationFrame(ikuti);
    };
    ikuti();
    return () => cancelAnimationFrame(frame);
  }, [hit]);

  // Tembakan berat menggambar busur lebih tebal daripada serempetan.
  const stroke = 4 + hit.severity * 5;

  return (
    <>
      <span
        ref={arc}
        className="arah-kena absolute top-1/2 left-1/2"
        data-penembak={hit.attackerId}
        style={{
          transform: `translate(-50%, -50%) rotate(${hit.angleRad}rad)`,
          animation: `damage-arc ${ARC_MS}ms ease-out forwards`,
        }}
        aria-hidden
      >
        <svg width="190" height="190" viewBox="0 0 190 190" fill="none">
          {/* Busur digambar di sisi atas lalu ikut diputar oleh transform induk. */}
          <path
            d={`M 60 34 A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 130 34`}
            stroke="#fb7185"
            strokeWidth={stroke}
            strokeLinecap="round"
            opacity="0.95"
          />
        </svg>
      </span>
      <span
        ref={label}
        className="absolute top-1/2 left-1/2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-rose-200"
        style={{
          transform: `translate(-50%, -50%) rotate(${hit.angleRad}rad) translateY(${-LABEL_RADIUS}px) rotate(${-hit.angleRad}rad)`,
          animation: `damage-arc ${ARC_MS}ms ease-out forwards`,
        }}
        aria-hidden
      >
        {hit.attackerName}
        {hit.count > 1 ? ` ×${hit.count}` : ""}
      </span>
    </>
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
        <span className="absolute inset-0 bg-slate-950/55" aria-hidden />
      ) : null}
    </div>
  );
}
