"use client";

import { useEffect, useRef } from "react";
import { MapThumbnail } from "@/components/maps/map-thumbnail";
import { ActionButton } from "@/components/ui/action-button";
import { mapFeel, sightWord, sizeWord, type MapFacts } from "@/lib/game/map-info";
import type { ArenaMapInfo } from "@/types/game";

/** Satu baris keterangan angka di panel samping. */
function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-[10px] tracking-[0.15em] text-slate-500 uppercase">
        {label}
      </span>
      <span className="text-right text-sm font-medium text-slate-200">{value}</span>
    </div>
  );
}

/**
 * Warna balok yang paling sering dipakai di antara balok setinggi tertentu,
 * atau null bila peta ini tidak punya satu pun balok semacam itu.
 */
function warnaDominan(map: ArenaMapInfo, tinggi: boolean): string | null {
  const hitung = new Map<string, number>();
  for (const block of map.blocks) {
    const solid = block.position[1] + block.size[1] / 2 >= 1.5;
    if (solid !== tinggi || !block.color) continue;
    hitung.set(block.color, (hitung.get(block.color) ?? 0) + 1);
  }

  let terbanyak: string | null = null;
  let jumlah = 0;
  for (const [warna, n] of hitung) {
    if (n > jumlah) {
      terbanyak = warna;
      jumlah = n;
    }
  }
  return terbanyak;
}

/**
 * Keterangan arti bentuk pada denah; tanpa ini denahnya cuma kumpulan kotak.
 *
 * Dua hal membuatnya mengikuti peta yang sedang dilihat, bukan jadi daftar
 * tetap. Petak warnanya mengambil warna balok peta itu sendiri — petak
 * abu-abu di sebelah denah bernuansa cokelat membuat pembacanya mencari-cari
 * bentuk yang warnanya tidak ada di gambar. Dan baris yang tidak berlaku
 * dibuang sama sekali: Lorong Pabrik tidak punya satu pun lantai naik, jadi
 * menerangkannya di sana hanya menyuruh orang mencari sesuatu yang memang
 * tidak ada.
 */
function Legend({ map }: { map: ArenaMapInfo }) {
  const tinggi = warnaDominan(map, true);
  const rendah = warnaDominan(map, false);

  const item = [
    tinggi && {
      warna: tinggi,
      opacity: 0.95,
      teks: "Penghalang tinggi — memutus pandangan",
    },
    rendah && {
      warna: rendah,
      opacity: 0.45,
      teks: "Lantai naik — bisa dipijak, bisa dilihat melewatinya",
    },
    map.spawnPoints.length > 0 && {
      warna: "#34d399",
      opacity: 0.75,
      teks: "Titik awal pemain dan lawan",
      bulat: true,
    },
  ].filter((x): x is { warna: string; opacity: number; teks: string; bulat?: boolean } =>
    Boolean(x),
  );

  return (
    <ul className="space-y-1.5">
      {item.map((x) => (
        <li key={x.teks} className="flex items-center gap-2 text-[11px] text-slate-400">
          <span
            className={`h-2.5 w-2.5 shrink-0 ${x.bulat ? "rounded-full" : "rounded-[2px]"}`}
            style={{ backgroundColor: x.warna, opacity: x.opacity }}
            aria-hidden
          />
          {x.teks}
        </li>
      ))}
    </ul>
  );
}

/**
 * Layar pratinjau peta: denah besar beserta keterangannya.
 *
 * Memakai elemen `dialog` bawaan browser, bukan lapisan buatan sendiri. Dengan
 * itu jebakan fokus, tombol Escape, dan penonaktifan isi halaman di belakangnya
 * sudah benar tanpa satu baris pun kode tambahan — tiga hal yang justru paling
 * sering salah pada dialog buatan tangan.
 *
 * Peta bisa dibolak-balik dari dalam dialog. Itu yang membuatnya benar-benar
 * layar pratinjau alih-alih sekadar pembesar: pemain bisa membandingkan bentuk
 * ketiga arena berturut-turut tanpa harus menutup dan membuka lagi.
 *
 * Membolak-balik di sini TIDAK mengubah peta yang dipakai bertanding. Dialog
 * ini punya penunjuknya sendiri, dan pilihan baru berpindah saat pemain
 * menekan "Pakai peta ini". Bedanya penting: melihat-lihat lalu menutup dengan
 * Escape harus mengembalikan keadaan seperti semula, bukan diam-diam
 * meninggalkan pemain dengan peta terakhir yang kebetulan ia lihat.
 */
export function MapPreviewDialog({
  map,
  facts,
  allFacts,
  open,
  onClose,
  onConfirm,
  onPrev,
  onNext,
  position,
  isSelected,
}: {
  map: ArenaMapInfo;
  facts: MapFacts;
  allFacts: MapFacts[];
  open: boolean;
  /** Menutup TANPA mengubah pilihan. */
  onClose: () => void;
  /** Menjadikan peta yang sedang dilihat sebagai pilihan, lalu menutup. */
  onConfirm: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Urutan peta ini di katalog, mis. "2 dari 3". */
  position: { current: number; total: number };
  /** Benar bila peta yang sedang dilihat memang yang dipakai bertanding. */
  isSelected: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /**
   * Escape dan klik di luar menutup dialog lewat browser, bukan lewat React,
   * jadi keadaan di sini harus ikut disamakan — kalau tidak, dialog yang sudah
   * tertutup tetap dianggap terbuka dan tidak bisa dibuka lagi.
   */
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={`Pratinjau peta ${map.name}`}
      onClick={(event) => {
        // Klik pada latar gelap di luar kotak dialog menutupnya. Elemen dialog
        // mencakup latar itu, jadi klik tepat pada dialog sendiri berarti klik
        // di luar isinya.
        if (event.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[min(56rem,92vw)] rounded-2xl border border-white/10 bg-slate-950 p-0 text-slate-200 backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
            Pratinjau peta · {position.current} dari {position.total}
          </p>
          <h2 className="mt-1.5 flex min-w-0 items-center gap-2 text-2xl font-bold text-white">
            <span className="truncate">{map.name}</span>
            {/*
              Penanda ini yang membuat pemain tahu di mana ia berdiri saat
              membolak-balik: tanpa itu, tiga peta terlihat sama-sama "belum
              dipilih" dan tidak ada cara mengetahui mana yang akan dipakai
              kalau ia menutup begitu saja.
            */}
            {isSelected ? (
              <span className="shrink-0 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
                Sedang dipakai
              </span>
            ) : null}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pratinjau"
          className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Tutup
        </button>
      </div>

      <div className="grid gap-5 px-5 py-5 md:grid-cols-[1fr_17rem]">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <MapThumbnail map={map} showScale />
        </div>

        <div className="flex flex-col">
          <p className="text-sm leading-relaxed text-slate-400">{map.description}</p>

          <div className="mt-4">
            <Row label="Ukuran" value={`${sizeWord(facts, allFacts)} · ${facts.span}m`} />
            <Row
              label="Jarak pandang"
              value={`${sightWord(facts)} · ${Math.round(facts.typicalSightline)}m`}
            />
            <Row label="Penghalang" value={facts.coverCount} />
            <Row label="Titik awal" value={map.spawnPoints.length} />
            <Row label="Maks lawan" value={facts.maxBots} />
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            {mapFeel(facts, allFacts)}
          </p>

          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="mb-2 text-[9px] tracking-[0.15em] text-slate-500 uppercase">
              Keterangan denah
            </p>
            <Legend map={map} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-lg border border-white/15 px-3.5 py-2 text-[13px] text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            ← Peta sebelumnya
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg border border-white/15 px-3.5 py-2 text-[13px] text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Peta berikutnya →
          </button>
        </div>

        <ActionButton
          variant={isSelected ? "biasa" : "utama"}
          size="ringkas"
          onClick={onConfirm}
        >
          {isSelected ? "Tetap pakai peta ini" : "Pakai peta ini"}
        </ActionButton>
      </div>
    </dialog>
  );
}
