"use client";

import { useEffect } from "react";
import { keepCursorFree } from "@/lib/game/keep-cursor-free";
import { useSettingsSaveStore } from "@/lib/store/settings-save-store";
import { loadSettingsRemote } from "@/lib/api/settings-remote";
import {
  applyServerSettings,
  isApplyingServerSettings,
  writeLocalSettingsTime,
} from "@/lib/settings/remote-apply";
import { SETTINGS_STORAGE_KEY, useSettingsStore } from "@/lib/store/settings-store";

/**
 * Menjaga satu state pengaturan di semua tab dan menyimpan salinannya:
 *
 * - Saat tab lain menyimpan pengaturan baru, tab ini membaca ulang simpanannya
 *   sehingga volume, grafis, sensitivitas, dan tata tombol langsung ikut berubah.
 * - Setiap perubahan dari tab ini dikirim ke penyimpan server (ditunda sebentar
 *   supaya menggeser slider tidak mengirim puluhan permintaan).
 * - Kalau penyimpanan gagal, notifikasi muncul; nilai yang dipilih tetap dipakai.
 */
export function SettingsSync() {
  useEffect(() => {
    let fromOtherTab = false;
    let cancelled = false;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_STORAGE_KEY || event.storageArea !== localStorage) return;
      fromOtherTab = true;
      void Promise.resolve(useSettingsStore.persist.rehydrate()).finally(() => {
        fromOtherTab = false;
      });
    };
    const unsubscribe = useSettingsStore.subscribe((state, previous) => {
      // Perubahan hasil membaca ulang tab lain sudah disimpan oleh tab itu,
      // dan yang baru dimuat dari server tidak perlu dikirim balik.
      if (fromOtherTab || isApplyingServerSettings()) return;
      if (state.audio === previous.audio && state.graphics === previous.graphics && state.controls === previous.controls) return;
      writeLocalSettingsTime(Date.now());
      useSettingsSaveStore.getState().queueSave({ audio: state.audio, graphics: state.graphics, controls: state.controls });
    });
    // Pengaturan ikut pemain: bila server punya simpanan, itu yang dipakai;
    // bila belum, pengaturan di perangkat ini dikirim sebagai simpanan pertama.
    // Yang lebih baru menang: simpanan server dipakai hanya bila tidak lebih
    // lama dari perubahan terakhir di perangkat ini, supaya perubahan yang
    // belum sempat terkirim tidak tertimpa nilai lama dari server.
    void loadSettingsRemote().then((saved) => {
      if (cancelled || !saved) return;
      const serverNewer = applyServerSettings(saved);
      // Perangkat ini lebih baru, atau ada bagian yang belum pernah tersimpan
      // di server: kirim pengaturan perangkat ini.
      if (!serverNewer || !saved.audio || !saved.graphics || !saved.controls) {
        const { audio, graphics, controls } = useSettingsStore.getState();
        useSettingsSaveStore.getState().queueSave({ audio, graphics, controls });
      }
    });

    const onExit = () => useSettingsSaveStore.getState().flushOnExit();
    window.addEventListener("pagehide", onExit);

    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onExit);
      window.removeEventListener("storage", onStorage);
      unsubscribe();
    };
  }, []);
  return <SettingsSaveFailure />;
}

/**
 * Notifikasi gagal simpan. Menegaskan bahwa nilai baru tetap berlaku, lalu
 * menawarkan coba lagi. Tetap terpasang supaya pembaca layar mengumumkannya.
 */
function SettingsSaveFailure() {
  const status = useSettingsSaveStore((state) => state.status);
  const message = useSettingsSaveStore((state) => state.message);
  const localFailed = useSettingsSaveStore((state) => state.localFailed);
  const dismissed = useSettingsSaveStore((state) => state.dismissed);
  const retry = useSettingsSaveStore((state) => state.retry);
  const dismiss = useSettingsSaveStore((state) => state.dismiss);

  const remoteFailed = status === "error";
  const visible = (remoteFailed || localFailed) && !dismissed;
  const text = remoteFailed
    ? `Pengaturan gagal disimpan ke server${message ? ` (${message})` : ""}. Nilai barumu tetap dipakai di perangkat ini.`
    : "Browser menolak menyimpan pengaturan. Nilai barumu tetap dipakai sampai tab ini ditutup.";

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={keepCursorFree}
      className={`fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[92vw] items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-950/95 px-4 py-2 text-sm text-amber-100 shadow-lg transition-opacity ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {visible ? (
        <>
          <span>{text}</span>
          {remoteFailed ? (
            <button
              type="button"
              onClick={(event) => {
                keepCursorFree(event);
                retry();
              }}
              className="shrink-0 rounded-md border border-amber-300/50 px-2.5 py-1 text-xs font-semibold hover:bg-amber-400/10"
            >
              Coba lagi
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Tutup pemberitahuan"
            onClick={(event) => {
              keepCursorFree(event);
              dismiss();
            }}
            className="shrink-0 text-amber-300/80 hover:text-amber-100"
          >
            ✕
          </button>
        </>
      ) : null}
    </div>
  );
}
