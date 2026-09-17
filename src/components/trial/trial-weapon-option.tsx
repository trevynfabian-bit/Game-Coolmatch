"use client";

import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import { killSummary, weaponFeel } from "@/lib/weapons/weapon-feel";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";
import type { Weapon } from "@/types/game";

/**
 * Satu senjata yang bisa dipilih untuk uji coba.
 *
 * Bukan kartu yang sama dengan halaman Pilih Senjata, dan itu disengaja. Di
 * sini tidak ada senjata terkunci sama sekali — yang terkunci belum bisa
 * dibawa ke mana pun — jadi kolom gembok dan syarat membukanya tidak punya
 * pekerjaan. Yang menggantikannya adalah satu baris rasa tembakan: berapa
 * peluru untuk menumbangkan lawan dan pada jarak berapa senjata itu betah.
 * Itulah yang benar-benar dicari pemain yang sedang memutuskan apa yang ingin
 * DICOBA, bukan angka magasin.
 *
 * Penandanya `role="radio"`, bukan `aria-pressed`. Daftar ini satu pilihan
 * dari sekian, dan tombol tertekan menggambarkan sakelar yang berdiri sendiri.
 * Konsekuensinya hanya senjata terpilih yang masuk urutan Tab, jadi induknya
 * WAJIB menyediakan navigasi tombol panah.
 */
export function TrialWeaponOption({
  weapon,
  selected,
  onSelect,
  buttonRef,
}: {
  weapon: Weapon;
  selected: boolean;
  onSelect: () => void;
  /** Dipegang induknya untuk memindahkan fokus saat tombol panah ditekan. */
  buttonRef?: (element: HTMLButtonElement | null) => void;
}) {
  const accent = WEAPON_SHAPES[weapon.type].accent;
  const feel = weaponFeel(weapon);

  return (
    <button
      type="button"
      ref={buttonRef}
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={`relative flex w-full items-center gap-4 overflow-hidden rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
        selected
          ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]"
          : "border-white/10 bg-slate-900/60 hover:border-white/25 hover:bg-slate-900"
      }`}
    >
      {selected ? (
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      ) : null}

      <span
        className="w-20 shrink-0 sm:w-24"
        style={{ color: selected ? accent : "#64748b" }}
      >
        <WeaponSilhouette type={weapon.type} className="h-8 w-full" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-slate-100">
            {weapon.name}
          </span>
          <span className="text-[11px] text-slate-500">
            {WEAPON_TYPE_LABEL[weapon.type]}
          </span>
          {selected ? (
            <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
              Terpilih
            </span>
          ) : null}
        </span>

        <span className="mt-1 block text-[11px] text-slate-500">
          {killSummary(feel)}
          <span className="text-slate-700"> · </span>
          {feel.rangeWord}
        </span>
      </span>
    </button>
  );
}
