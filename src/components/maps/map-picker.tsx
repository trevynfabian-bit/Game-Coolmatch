"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MapCard } from "@/components/maps/map-card";
import { MapPreviewDialog } from "@/components/maps/map-preview-dialog";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { mapFacts } from "@/lib/game/map-info";
import { MOCK_MAPS, findMap } from "@/lib/mock/maps";
import { useMapStore } from "@/lib/store/map-store";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";

/**
 * Halaman Pilih Peta: seluruh peta yang bisa dimainkan, dengan keterangan yang
 * cukup untuk memilih tanpa harus mencobanya satu per satu.
 *
 * Sumber datanya masih katalog tiruan. Ketika layer backend siap, `MOCK_MAPS`
 * tinggal diganti hasil pengambilan tabel `maps` — bentuk yang dibaca komponen
 * ini tidak berubah.
 */
export function MapPicker() {
  const selectedMapId = useMapStore((state) => state.selectedMapId);
  const selectMap = useMapStore((state) => state.selectMap);
  const botCount = useMatchSetupStore((state) => state.botCount);

  const facts = useMemo(() => MOCK_MAPS.map((map) => mapFacts(map)), []);
  const selected = findMap(selectedMapId);
  const selectedIndex = MOCK_MAPS.findIndex((m) => m.id === selected.id);
  const selectedFacts = facts[selectedIndex];

  const kartuRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Peta yang sedang DILIHAT di layar pratinjau — bukan yang dipakai
   * bertanding. Keduanya sengaja dipisah: membolak-balik pratinjau lalu
   * menutupnya dengan Escape harus mengembalikan keadaan seperti semula.
   * Null berarti pratinjaunya tertutup.
   */
  const [pratinjauIndex, setPratinjauIndex] = useState<number | null>(null);

  /** Menggeser sebuah penunjuk sejauh `langkah`, berputar di ujung katalog. */
  const geser = useCallback((dari: number, langkah: number) => {
    const jumlah = MOCK_MAPS.length;
    return (dari + langkah + jumlah) % jumlah;
  }, []);

  /**
   * Tombol panah memindahkan pilihan, Home dan End melompat ke ujung.
   *
   * Ini bagian yang tidak boleh ditinggalkan begitu daftar ini dinyatakan
   * sebagai sekelompok radio: hanya peta terpilih yang masuk urutan Tab, jadi
   * tanpa tombol panah, peta lain tidak bisa dicapai dari papan ketik sama
   * sekali — penanda yang lebih tepat justru akan membuat halamannya lebih
   * sulit dipakai daripada sebelumnya.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const jumlah = MOCK_MAPS.length;
      let tujuan: number;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          tujuan = geser(selectedIndex, 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          tujuan = geser(selectedIndex, -1);
          break;
        case "Home":
          tujuan = 0;
          break;
        case "End":
          tujuan = jumlah - 1;
          break;
        default:
          return;
      }

      // Panah atas/bawah menggulung halaman bila dibiarkan, dan gulungan itu
      // membuat kartu yang baru dipilih justru keluar dari pandangan.
      event.preventDefault();
      selectMap(MOCK_MAPS[tujuan].id);
      kartuRefs.current[tujuan]?.focus();
    },
    [geser, selectedIndex, selectMap],
  );

  /**
   * Jumlah lawan yang dipilih pemain bisa melebihi daya tampung peta yang baru
   * ia pilih, sebab batasnya ditentukan titik spawn tiap peta. Itu tidak
   * diubah diam-diam di sini — layar Atur Lawan yang merapikannya saat dibuka —
   * tetapi pemain berhak tahu sebelum terlanjur masuk arena.
   */
  const botsTerpotong = botCount > selectedFacts.maxBots;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Medan pertempuran
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Pilih Peta
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Tiap peta punya ukuran, jumlah tempat berlindung, dan jarak pandang
          yang berbeda — dan karena itu terasa berbeda pula dimainkan. Pilih satu
          sebelum masuk arena.
        </p>
      </header>

      <section
        role="radiogroup"
        aria-label="Peta yang bisa dimainkan"
        onKeyDown={onKeyDown}
        className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
      >
        {MOCK_MAPS.map((map, index) => (
          <MapCard
            key={map.id}
            map={map}
            facts={facts[index]}
            allFacts={facts}
            selected={map.id === selected.id}
            onSelect={() => selectMap(map.id)}
            buttonRef={(element) => {
              kartuRefs.current[index] = element;
            }}
          />
        ))}
      </section>

      <div className="mt-8 rounded-xl border border-white/10 bg-slate-900/40 px-5 py-4">
        <p className="text-[11px] text-slate-400">
          Kamu akan bertanding di{" "}
          <span className="font-medium text-slate-200">{selected.name}</span>,
          yang menampung sampai{" "}
          <span className="font-medium text-slate-200">
            {selectedFacts.maxBots} lawan
          </span>
          .
        </p>

        {botsTerpotong ? (
          <p className="mt-1.5 text-[11px] text-amber-200/80">
            Kamu sedang mengatur {botCount} lawan, lebih banyak daripada yang
            muat di peta ini. Jumlahnya akan disesuaikan ke {selectedFacts.maxBots}
            {" "}saat kamu membuka layar Atur Lawan.
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-slate-500">
            Pilihan ini tersimpan otomatis di perangkat ini.
          </p>
        )}

        <ActionRow className="mt-4">
          <ActionButton
            variant="utama"
            onClick={() => setPratinjauIndex(selectedIndex)}
          >
            Lihat pratinjau
          </ActionButton>
          <ActionButton href="/lawan">Atur lawan</ActionButton>
          <ActionButton href="/senjata">Ganti senjata</ActionButton>
          <ActionButton href="/">Kembali ke menu</ActionButton>
        </ActionRow>
      </div>

      {/*
        Dialog hanya dirender saat terbuka, sehingga penunjuk pratinjaunya
        selalu mulai dari peta yang sedang dipakai alih-alih dari peta terakhir
        yang kebetulan dilihat sesi sebelumnya.
      */}
      {pratinjauIndex !== null ? (
        <MapPreviewDialog
          map={MOCK_MAPS[pratinjauIndex]}
          facts={facts[pratinjauIndex]}
          allFacts={facts}
          open
          isSelected={pratinjauIndex === selectedIndex}
          onClose={() => setPratinjauIndex(null)}
          onConfirm={() => {
            selectMap(MOCK_MAPS[pratinjauIndex].id);
            setPratinjauIndex(null);
          }}
          onPrev={() => setPratinjauIndex(geser(pratinjauIndex, -1))}
          onNext={() => setPratinjauIndex(geser(pratinjauIndex, 1))}
          position={{ current: pratinjauIndex + 1, total: MOCK_MAPS.length }}
        />
      ) : null}
    </div>
  );
}
