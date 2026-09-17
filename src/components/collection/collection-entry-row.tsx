"use client";

import { UnlockRequirementNote } from "@/components/weapons/unlock-requirement";
import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import { ActionButton } from "@/components/ui/action-button";
import type { CollectionEntry } from "@/lib/game/collection";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";

/** Gembok kecil di samping nama senjata yang belum terbuka. */
function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden>
      <rect x="2.5" y="5" width="7" height="5.5" rx="1" fill="currentColor" />
      <path
        d="M4.25 5V3.75a1.75 1.75 0 0 1 3.5 0V5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Satu senjata di halaman koleksi.
 *
 * Bukan tombol pilih seperti di halaman Pilih Senjata — di sini senjata
 * ditampilkan sebagai catatan koleksi, dan tindakannya berdiri sendiri. Itu
 * sebabnya baris ini elemen biasa dengan tombol di dalamnya, bukan satu tombol
 * besar: senjata terkunci tidak punya tindakan sama sekali, dan yang terbuka
 * punya dua.
 */
export function CollectionEntryRow({
  entry,
  onTry,
  highlighted = false,
}: {
  entry: CollectionEntry;
  /** Membawa senjata ini ke tempat latihan; hanya untuk yang sudah terbuka. */
  onTry: () => void;
  /** Menyorot senjata yang paling dekat terbuka. */
  highlighted?: boolean;
}) {
  const { weapon, ownership } = entry;
  const locked = !ownership.isUnlocked;
  const accent = WEAPON_SHAPES[weapon.type].accent;

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center ${
        highlighted
          ? "border-amber-400/40 bg-amber-500/5"
          : locked
            ? "border-white/5 bg-slate-900/35"
            : "border-white/10 bg-slate-900/60"
      }`}
    >
      <span
        className={`w-20 shrink-0 sm:w-24 ${locked ? "opacity-35" : ""}`}
        style={{ color: locked ? "#64748b" : accent }}
      >
        <WeaponSilhouette type={weapon.type} className="h-8 w-full" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={`truncate text-sm font-semibold ${
              locked ? "text-slate-500" : "text-slate-100"
            }`}
          >
            {weapon.name}
          </span>
          <span className="text-[11px] text-slate-500">
            {WEAPON_TYPE_LABEL[weapon.type]}
          </span>
          {locked ? (
            <LockIcon className="h-3 w-3 shrink-0 text-slate-500" />
          ) : (
            <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
              Terbuka
            </span>
          )}
          {highlighted ? (
            <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-amber-300 uppercase">
              Paling dekat
            </span>
          ) : null}
        </span>

        {locked && ownership.requirement ? (
          <UnlockRequirementNote
            requirement={ownership.requirement}
            className="mt-1.5"
          />
        ) : (
          <span className="mt-1 block text-[11px] text-slate-500">
            {weapon.damage} kerusakan
            <span className="text-slate-700"> · </span>
            {weapon.fireRate} peluru/menit
            <span className="text-slate-700"> · </span>
            magasin {weapon.magazineSize}
          </span>
        )}
      </span>

      {/*
        Hanya senjata terbuka yang punya tindakan. Senjata terkunci sengaja
        tidak diberi tombol yang tidak bisa ditekan: tombol mati hanya
        menggoda pemain untuk mengkliknya berulang kali dan menebak kenapa
        tidak terjadi apa-apa. Syaratnya sudah tertulis tepat di sebelahnya.
      */}
      {locked ? null : (
        <ActionButton size="ringkas" onClick={onTry} className="shrink-0">
          Coba di latihan
        </ActionButton>
      )}
    </li>
  );
}
