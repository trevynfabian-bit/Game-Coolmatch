"use client";

import { useEffect } from "react";
import { SETTINGS_STORAGE_KEY, useSettingsStore } from "@/lib/store/settings-store";

/**
 * Menjaga satu state pengaturan di semua tab: saat tab lain menyimpan
 * pengaturan baru, tab ini membaca ulang simpanannya sehingga volume, grafis,
 * sensitivitas, dan tata tombol langsung ikut berubah tanpa memuat ulang.
 */
export function SettingsSync() {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_STORAGE_KEY || event.storageArea !== localStorage) return;
      void useSettingsStore.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
