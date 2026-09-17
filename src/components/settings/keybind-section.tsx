"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BINDABLE_ACTIONS,
  DEFAULT_BINDINGS,
  FIXED_CONTROLS,
  bindingLabel,
  checkRebind,
  keyLabel,
  type BindableAction,
} from "@/lib/game/keybinds";
import { useKeybindStore } from "@/lib/store/keybind-store";
import { SENSITIVITY_MAX, SENSITIVITY_MIN } from "@/lib/game/settings";
import { useSettingsStore } from "@/lib/store/settings-store";

/** Tombol yang tertulis seperti pada papan ketik. */
function KeyChip({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`rounded border px-2 py-0.5 text-center font-mono text-[11px] whitespace-nowrap ${
        muted
          ? "border-white/10 bg-white/[0.03] text-slate-500"
          : "border-white/15 bg-white/5 text-slate-200"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Bagian Atur Tombol: mengubah tombol gerak dan aksi, lalu menyimpannya.
 *
 * Penangkapan tombol memakai `event.code`, bukan `event.key`. Kode menyebut
 * posisi fisik tombol, sehingga pemetaan tetap benar saat Caps Lock menyala
 * dan tidak bergeser pada tata letak papan ketik lain — dan itulah yang juga
 * dipakai drei di dalam arena. Harganya, kodenya tidak enak dibaca, jadi
 * seluruh tampilannya lewat `keyLabel`.
 */
export function KeybindSection() {
  const bindings = useKeybindStore((state) => state.bindings);
  const rebind = useKeybindStore((state) => state.rebind);
  const resetAction = useKeybindStore((state) => state.resetAction);
  const resetAll = useKeybindStore((state) => state.resetAll);
  const sensitivity = useSettingsStore((state) => state.controls.sensitivity);
  const setSensitivity = useSettingsStore((state) => state.setSensitivity);

  /** Aksi yang sedang menunggu tombol; null berarti tidak ada. */
  const [menunggu, setMenunggu] = useState<BindableAction | null>(null);
  const [masalah, setMasalah] = useState<string | null>(null);

  const batal = useCallback(() => {
    setMenunggu(null);
    setMasalah(null);
  }, []);

  useEffect(() => {
    if (!menunggu) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // Selama menunggu, SEMUA tombol ditelan. Kalau tidak, menekan spasi
      // untuk memasangnya pada Lompat malah menekan kembali tombol "Ubah"
      // yang masih memegang fokus, dan penangkapannya berulang tanpa henti.
      event.preventDefault();
      event.stopPropagation();

      if (event.code === "Escape") {
        batal();
        return;
      }

      const salah = checkRebind(bindings, menunggu, event.code);
      if (salah) {
        setMasalah(
          salah.kind === "bentrok"
            ? `${keyLabel(event.code)} sudah dipakai ${salah.withLabel}.`
            : salah.reason,
        );
        return;
      }

      rebind(menunggu, event.code);
      setMenunggu(null);
      setMasalah(null);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [menunggu, bindings, rebind, batal]);

  const adaYangDiubah = BINDABLE_ACTIONS.some(
    (entry) => bindings[entry.action] !== DEFAULT_BINDINGS[entry.action],
  );

  return (
    <div>
      {/*
        Sensitivitas berada di bagian tombol, bukan tampilan, karena ia bagian
        dari cara membidik — sama seperti tombol gerak. Ia juga satu-satunya
        pengaturan di halaman ini yang langsung terasa di tangan begitu diubah,
        jadi ia ditaruh paling atas: pemain yang datang untuk membetulkan
        rasa membidik menemukannya lebih dulu.
      */}
      <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-white/10 pb-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] text-slate-300">
            Sensitivitas mouse
          </span>
          <span className="block text-[10px] text-slate-600">
            Seratus persen sama dengan kecepatan bawaan.
          </span>
        </span>
        <input
          id="sensitivitas"
          type="range"
          min={SENSITIVITY_MIN}
          max={SENSITIVITY_MAX}
          step={5}
          value={sensitivity}
          aria-label="Sensitivitas mouse"
          onChange={(event) => setSensitivity(Number(event.target.value))}
          className="h-1.5 w-full max-w-[14rem] cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
        />
        <span className="w-12 shrink-0 text-right font-mono text-xs text-slate-300 tabular-nums">
          {sensitivity}%
        </span>
      </div>

      <ul className="divide-y divide-white/5">
        {BINDABLE_ACTIONS.map((entry) => {
          const sedang = menunggu === entry.action;
          const diubah = bindings[entry.action] !== entry.defaultCode;

          return (
            <li
              key={entry.action}
              className="flex flex-wrap items-center gap-3 py-2.5"
            >
              <span className="min-w-0 flex-1 text-[13px] text-slate-300">
                {entry.label}
                {entry.alternates.length > 0 ? (
                  <span className="block text-[10px] text-slate-600">
                    {entry.alternates.map(keyLabel).join(", ")} selalu ikut
                    berlaku
                  </span>
                ) : null}
              </span>

              <KeyChip muted={sedang}>
                {sedang
                  ? "Tekan tombol…"
                  : bindingLabel(bindings, entry.action)}
              </KeyChip>

              <span className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    sedang
                      ? batal()
                      : (setMenunggu(entry.action), setMasalah(null))
                  }
                  aria-label={
                    sedang
                      ? `Batal mengubah tombol ${entry.label}`
                      : `Ubah tombol ${entry.label}`
                  }
                  className={`rounded-lg border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                    sedang
                      ? "border-amber-400/60 bg-amber-500/10 text-amber-200"
                      : "border-white/15 text-slate-300 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  {sedang ? "Batal" : "Ubah"}
                </button>

                {/*
                  Tombol pulih hanya muncul pada baris yang MEMANG sudah
                  diubah. Deretan tombol "bawaan" yang tidak melakukan apa-apa
                  di tiap baris hanya menambah keramaian tanpa menambah pilihan.
                */}
                {diubah ? (
                  <button
                    type="button"
                    onClick={() => resetAction(entry.action)}
                    aria-label={`Kembalikan tombol ${entry.label} ke bawaan`}
                    className="rounded-lg px-2 py-1 text-[12px] text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  >
                    Bawaan
                  </button>
                ) : null}
              </span>

              {sedang && masalah ? (
                <p
                  role="alert"
                  className="w-full text-[11px] text-amber-200/90"
                >
                  {masalah} Coba tombol lain, atau tekan Escape untuk batal.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {adaYangDiubah ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg px-2.5 py-1 text-[12px] text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Kembalikan semua tombol ke bawaan
          </button>
        </div>
      ) : null}

      {/*
        Tombol tetap ikut ditampilkan, lengkap dengan alasannya. Daftar yang
        hanya memuat tombol yang bisa diubah membuat pemain mengira Tembak dan
        Papan skor tidak ada sama sekali, lalu mencarinya di tempat lain.
      */}
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="mb-2 text-[9px] tracking-[0.15em] text-slate-500 uppercase">
          Tombol tetap
        </p>
        <ul className="space-y-1.5">
          {FIXED_CONTROLS.map((item) => (
            <li
              key={item.label}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]"
            >
              <span className="text-slate-400">{item.label}</span>
              <KeyChip muted>{item.keys}</KeyChip>
              <span className="text-[11px] text-slate-600">{item.reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
