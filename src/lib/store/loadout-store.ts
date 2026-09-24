import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { firstUnlockedWeaponId, isWeaponUnlocked } from "@/lib/store/weapon-store";

/** Pilihan bawaan: senapan serbu, bila memang sudah terbuka. */
const DEFAULT_WEAPON_ID = isWeaponUnlocked(MOCK_WEAPONS[2]?.id ?? "")
  ? MOCK_WEAPONS[2].id
  : firstUnlockedWeaponId();

/**
 * Pilihan perlengkapan pemain: senjata yang dibawa masuk arena. Tersimpan di
 * server (/api/senjata/loadout) supaya ikut ke sesi berikutnya. Pilihan
 * diterapkan seketika lalu dikirim; bila server menolaknya (mis. senjata
 * ternyata masih terkunci), pilihan dikembalikan ke yang tersimpan di server.
 */
interface LoadoutState {
  selectedWeaponId: string;
  load: () => Promise<void>;
  /** Mengabaikan senjata yang masih terkunci, jadi pilihan selalu sah. */
  selectWeapon: (weaponId: string) => void;
}

let saveGeneration = 0;

export const useLoadoutStore = create<LoadoutState>((set, get) => ({
  selectedWeaponId: DEFAULT_WEAPON_ID,
  load: async () => {
    const generation = saveGeneration;
    const response = await apiFetch<{ loadout: { primaryWeaponId: string }; degraded?: boolean }>("/api/senjata/loadout");
    // Pemain sudah memilih lagi selagi permintaan berjalan: pilihannya menang.
    if (generation !== saveGeneration || !response.ok || response.data.degraded) return;
    const weaponId = response.data.loadout.primaryWeaponId;
    if (MOCK_WEAPONS.some((weapon) => weapon.id === weaponId)) set({ selectedWeaponId: weaponId });
  },
  selectWeapon: (weaponId) => {
    const previous = get().selectedWeaponId;
    if (previous === weaponId || !isWeaponUnlocked(weaponId)) return;
    set({ selectedWeaponId: weaponId });
    const generation = ++saveGeneration;
    void apiFetch("/api/senjata/loadout", { method: "POST", body: { weaponId } }).then((response) => {
      if (response.ok || generation !== saveGeneration) return;
      // Ditolak permanen: kembali ke pilihan yang tersimpan di server.
      if (response.status === 404 || response.status === 409) void get().load();
    });
  },
}));
