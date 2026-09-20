"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchOpponentSettings,
  saveOpponentSettingsRemote,
} from "@/lib/api/opponent-settings";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";

/** Jeda sebelum perubahan pilihan dikirim, supaya menggeser slider tidak jadi rentetan PUT. */
const SAVE_DEBOUNCE_MS = 350;

export type OpponentSettingsSyncStatus =
  | "memuat"
  | "tersimpan"
  | "menyimpan"
  | "luring";

/**
 * Menyamakan pengaturan lawan di perangkat dengan simpanan di server.
 *
 * Saat layar dibuka, pilihan yang tersimpan di server diambil dan, bila
 * pemain memang pernah menyimpan (updatedAt terisi), dipakai menimpa simpanan
 * perangkat — server yang dipercaya, perangkat hanya cache untuk tampil
 * seketika. Sesudah itu setiap perubahan pilihan dikirim ke server dengan
 * jeda singkat. Perubahan yang datang dari server sendiri tidak dikirim balik.
 *
 * Kegagalan jaringan tidak pernah menghalangi layar: pilihannya tetap
 * tersimpan di perangkat, dan statusnya berkata "luring" supaya pemain tahu
 * pilihan ini belum sampai ke server.
 */
export function useOpponentSettingsSync(): OpponentSettingsSyncStatus {
  const [status, setStatus] = useState<OpponentSettingsSyncStatus>("memuat");
  const applyingRemote = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let batal = false;

    fetchOpponentSettings().then((remote) => {
      if (batal) return;
      if (!remote) {
        setStatus("luring");
        return;
      }
      if (remote.updatedAt !== null) {
        const store = useMatchSetupStore.getState();
        applyingRemote.current = true;
        store.setDifficulty(remote.difficulty);
        store.setBotCount(remote.botCount);
        applyingRemote.current = false;
      }
      setStatus(remote.degraded ? "luring" : "tersimpan");
    });

    const unsubscribe = useMatchSetupStore.subscribe((state, previous) => {
      if (applyingRemote.current) return;
      if (
        state.difficulty === previous.difficulty &&
        state.botCount === previous.botCount
      ) {
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      setStatus("menyimpan");
      timer.current = setTimeout(() => {
        const { difficulty, botCount } = useMatchSetupStore.getState();
        saveOpponentSettingsRemote({ difficulty, botCount }).then((ok) => {
          if (!batal) setStatus(ok ? "tersimpan" : "luring");
        });
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      batal = true;
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return status;
}
