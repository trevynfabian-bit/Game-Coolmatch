"use client";

import { MapThumbnail } from "@/components/maps/map-thumbnail";
import { mapFeel, sightWord, sizeWord, type MapFacts } from "@/lib/game/map-info";
import type { ArenaMapInfo } from "@/types/game";

/**
 * Satu keterangan peta, ditulis sebagai baris label-nilai.
 *
 * Berbaris ke samping, bukan bertumpuk dalam kolom sempit. Nilai seperti
 * "Jarak menengah · 20m" tidak muat pada sepertiga lebar kartu dan akan
 * terpecah jadi tiga baris — membuat tinggi ketiga kartu berbeda-beda hanya
 * karena nama petanya kebetulan lebih panjang.
 */
function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[9px] tracking-[0.15em] text-slate-500 uppercase">
        {label}
      </span>
      <span className="text-right text-[13px] font-medium text-slate-200">
        {value}
      </span>
    </span>
  );
}

/**
 * Satu peta di daftar pilihan, berbentuk tombol.
 *
 * Angka-angkanya diturunkan dari bentuk petanya sendiri lewat `mapFacts`,
 * bukan ditulis di katalog — jadi menambah krat ke sebuah peta langsung
 * terlihat di sini alih-alih membuat keterangannya basi.
 */
export function MapCard({
  map,
  facts,
  allFacts,
  selected,
  onSelect,
  buttonRef,
}: {
  map: ArenaMapInfo;
  facts: MapFacts;
  /** Keterangan seluruh peta, dipakai membandingkan ukuran antar peta. */
  allFacts: MapFacts[];
  selected: boolean;
  onSelect: () => void;
  /** Dipegang daftar untuk memindahkan fokus saat tombol panah ditekan. */
  buttonRef?: (element: HTMLButtonElement | null) => void;
}) {
  return (
    /*
      role="radio", bukan aria-pressed. Keduanya sama-sama menandai "terpilih",
      tetapi artinya berbeda: aria-pressed menggambarkan tombol yang bisa
      dinyalakan dan dimatikan sendiri-sendiri, sedangkan peta adalah pilihan
      yang SALING MENIADAKAN. Dengan aria-pressed, pembaca layar mengumumkan
      tiga tombol terpisah tanpa petunjuk bahwa ketiganya alternatif satu sama
      lain; dengan radio, ia menyebut "1 dari 3" dan pemakainya tahu memilih
      satu berarti melepas yang lain.

      tabIndex mengikuti pilihan — hanya peta terpilih yang masuk urutan Tab,
      sisanya dicapai dengan tombol panah. Itu perilaku baku sekelompok radio,
      dan mencegah daftar panjang memakan belasan kali Tab untuk dilewati.
    */
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={`flex h-full flex-col rounded-xl border px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
        selected
          ? "border-emerald-400/70 bg-emerald-500/10"
          : "border-white/10 bg-slate-900/60 hover:border-white/25 hover:bg-slate-900"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {selected ? (
            <span className="text-sm text-emerald-400" aria-hidden>
              ✓
            </span>
          ) : null}
          <span className="truncate text-base font-semibold text-slate-100">
            {map.name}
          </span>
        </span>
        {selected ? (
          <span className="shrink-0 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
            Dipilih
          </span>
        ) : null}
      </span>

      {/*
        Denahnya diberi bingkai dan sudut membulat sendiri supaya terbaca
        sebagai gambar peta, bukan sebagai latar kartunya.
      */}
      <span
        className={`mt-3 block overflow-hidden rounded-lg border ${
          selected ? "border-emerald-400/30" : "border-white/10"
        }`}
      >
        <MapThumbnail map={map} />
      </span>

      <span className="mt-3 block flex-1 text-[11px] leading-relaxed text-slate-400">
        {map.description}
      </span>

      <span className="mt-4 grid gap-1.5 border-t border-white/10 pt-3">
        <Fact label="Ukuran" value={`${sizeWord(facts, allFacts)} · ${facts.span}m`} />
        <Fact
          label="Jarak pandang"
          value={`${sightWord(facts)} · ${Math.round(facts.typicalSightline)}m`}
        />
        <Fact label="Maks lawan" value={facts.maxBots} />
      </span>

      <span className="mt-3 block text-[11px] leading-relaxed text-slate-500">
        {mapFeel(facts, allFacts)}
      </span>
    </button>
  );
}
