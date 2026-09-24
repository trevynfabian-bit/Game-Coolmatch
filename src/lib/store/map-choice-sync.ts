import { apiFetch } from "@/lib/api/client";
import { DEFAULT_MAP } from "@/lib/mock/maps";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";

/**
 * Menyelaraskan peta pilihan pemain dengan server (/api/peta/pilihan):
 *
 * - Saat sesi dibuka, pilihan tersimpan di server dipulihkan (server menang,
 *   supaya pilihan ikut pindah perangkat). Bila server belum punya simpanan,
 *   pilihan di perangkat ini yang dikirim.
 * - Setiap kali pemain mengganti peta, pilihannya dikirim ke server. Gagal
 *   terkirim tidak mengganggu apa pun: pilihan tetap tersimpan di perangkat.
 *
 * Mengembalikan fungsi untuk berhenti menyimak.
 */
export function startMapChoiceSync(): () => void {
  let applyingServer = false;
  let cancelled = false;

  const save = (mapId: string) => void apiFetch("/api/peta/pilihan", { method: "POST", body: { mapId } });

  const unsubscribe = useMatchSetupStore.subscribe((state, previous) => {
    if (applyingServer || state.mapId === previous.mapId) return;
    save(state.mapId);
  });

  void apiFetch<{ choice: { mapId: string; updatedAt: number | null }; degraded?: boolean }>("/api/peta/pilihan").then(
    (response) => {
      if (cancelled || !response.ok || response.data.degraded) return;
      const { mapId, updatedAt } = response.data.choice;
      if (updatedAt != null) {
        applyingServer = true;
        useMatchSetupStore.getState().setMap(mapId);
        applyingServer = false;
      } else {
        const local = useMatchSetupStore.getState().mapId;
        if (local !== DEFAULT_MAP.id) save(local);
      }
    },
  );

  return () => {
    cancelled = true;
    unsubscribe();
  };
}
