"use client";

import { useEffect, useRef } from "react";
import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import { ActionButton } from "@/components/ui/action-button";
import { unlockFacts, type UnlockRequirement } from "@/lib/game/unlock";
import { killSummary, weaponFeel } from "@/lib/weapons/weapon-feel";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";
import type { Weapon } from "@/types/game";

/** Satu angka senjata beserta labelnya. */
function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-center">
      <p className="font-mono text-base font-semibold text-slate-100 tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[9px] tracking-[0.15em] text-slate-500 uppercase">
        {label}
      </p>
    </div>
  );
}

/**
 * Notifikasi bahwa sebuah senjata baru saja terbuka.
 *
 * Memakai elemen `dialog` bawaan browser, sama seperti pratinjau peta. Dengan
 * itu jebakan fokus, tombol Escape, dan penonaktifan isi di belakangnya sudah
 * benar tanpa kode tambahan — dan di sini hal itu penting sekali, sebab
 * notifikasi ini muncul di atas layar ringkasan akhir yang sendirinya penuh
 * tombol.
 *
 * Isinya bukan sekadar "senjata X terbuka". Yang membuat sebuah senjata baru
 * berarti adalah apa yang membedakannya dari yang sudah dipegang pemain, jadi
 * rasa tembakannya disebut lebih dulu — berapa peluru untuk menumbangkan, pada
 * jarak berapa ia betah — dan syarat yang barusan terpenuhi ikut ditulis
 * supaya jelas perayaan ini datang dari usaha yang mana.
 */
export function WeaponUnlockedDialog({
  weapon,
  requirement,
  open,
  onClose,
  onEquip,
}: {
  weapon: Weapon;
  /** Syarat yang barusan terpenuhi; boleh kosong bila tidak diketahui. */
  requirement?: UnlockRequirement | null;
  open: boolean;
  onClose: () => void;
  /** Menjadikannya senjata yang dibawa bertanding, lalu menutup. */
  onEquip: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const accent = WEAPON_SHAPES[weapon.type].accent;
  const feel = weaponFeel(weapon);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /**
   * Escape menutup dialog lewat browser, bukan lewat React, jadi keadaan di
   * sini harus ikut disamakan — kalau tidak, notifikasi yang sudah tertutup
   * tetap dianggap terbuka dan antreannya tidak pernah maju.
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
      aria-label={`Senjata baru terbuka: ${weapon.name}`}
      className="m-auto w-[min(26rem,92vw)] rounded-2xl border border-white/10 bg-slate-950 p-0 text-slate-200 backdrop:bg-slate-950/85 backdrop:backdrop-blur-sm"
    >
      {/*
        Berbeda dengan pratinjau peta, klik di luar kotak TIDAK menutup layar
        ini. Notifikasi ini muncul tanpa diminta, tepat saat pemain sedang
        mengarahkan kursor ke tombol layar ringkasan di belakangnya; klik yang
        sudah terlanjur diayunkan tidak boleh membuang kabar yang baru saja
        tampil sebelum sempat terbaca.
      */}
      <div
        className="px-6 pt-6 pb-5 text-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${accent}1a, transparent)`,
        }}
      >
        <p
          className="text-[10px] font-semibold tracking-[0.3em] uppercase"
          style={{ color: accent }}
        >
          Senjata baru terbuka
        </p>

        <span className="mx-auto mt-4 block w-40" style={{ color: accent }}>
          <WeaponSilhouette type={weapon.type} className="h-12 w-full" />
        </span>

        <h2 className="mt-3 text-2xl font-bold text-white">{weapon.name}</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          {WEAPON_TYPE_LABEL[weapon.type]}
          <span className="text-slate-700"> · </span>
          {weapon.automatic ? "Otomatis" : "Semi otomatis"}
        </p>

        <p
          className="mx-auto mt-4 rounded-lg border px-3 py-2 text-xs font-medium"
          style={{
            borderColor: `${accent}55`,
            backgroundColor: `${accent}14`,
            color: accent,
          }}
        >
          {killSummary(feel)}
        </p>
        <p className="mt-1.5 text-[11px] text-slate-500">{feel.rangeWord}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 px-6">
        <Fact label="Kerusakan" value={weapon.damage} />
        <Fact label="Peluru/menit" value={weapon.fireRate} />
        <Fact label="Magasin" value={weapon.magazineSize} />
      </div>

      {requirement ? (
        <p className="mt-4 px-6 text-center text-[11px] text-slate-500">
          Syaratnya terpenuhi:{" "}
          <span className="text-slate-300">
            {unlockFacts(requirement).label.toLowerCase()}
          </span>
          .
        </p>
      ) : null}

      <div className="mt-5 border-t border-white/10 px-6 py-4">
        {/*
          Ditumpuk ke bawah, bukan dijajarkan seperti deretan tombol di halaman
          biasa. Dialog ini hanya selebar 26rem; tiga tombol sebaris di dalamnya
          menyisakan sekitar seratus piksel masing-masing, dan "Bawa
          bertanding" pecah jadi dua baris. Tumpukan juga menempatkan tindakan
          yang paling mungkin diinginkan di paling atas, tempat mata jatuh
          setelah membaca nama senjatanya.
        */}
        <div className="grid gap-2">
          <ActionButton
            variant="utama"
            size="ringkas"
            href={`/uji?senjata=${encodeURIComponent(weapon.id)}`}
            className="block w-full"
          >
            Coba sekarang di arena uji
          </ActionButton>
          <ActionButton
            size="ringkas"
            onClick={onEquip}
            className="block w-full"
          >
            Bawa bertanding
          </ActionButton>
          <ActionButton
            size="ringkas"
            onClick={onClose}
            className="block w-full"
          >
            Nanti saja
          </ActionButton>
        </div>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-600">
          &ldquo;Bawa bertanding&rdquo; memakainya mulai pertandingan
          berikutnya; senjatanya juga sudah masuk daftar Pilih Senjata.
        </p>
      </div>
    </dialog>
  );
}
