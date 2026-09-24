import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import { findAttachment } from "@/lib/economy/upgrade-catalog";
import { emptyUpgradeState } from "@/lib/mock/shop";
import { useWalletStore } from "@/lib/store/wallet-store";
import type {
  AttachmentSlot,
  CoinTransaction,
  UpgradeStat,
  Wallet,
  WeaponUpgradeState,
} from "@/types/economy";

/**
 * State toko di klien: kepemilikan upgrade dan attachment per senjata.
 *
 * Isinya dimuat dari /api/toko saat sesi dibuka (lihat SessionBootstrap), jadi
 * upgrade yang dibeli kemarin langsung berlaku hari ini. Setiap aksi dikirim
 * ke server; state hanya diperbarui dari balasan server, bukan ditebak di
 * klien, sehingga harga dan saldo tidak bisa berselisih.
 */

export type ShopResult = { ok: true } | { ok: false; message: string };

interface ShopState {
  upgrades: Record<string, WeaponUpgradeState>;
  loaded: boolean;
  /** Kunci aksi yang sedang diproses, supaya tombolnya bisa dimatikan. */
  pending: string | null;
  load: () => Promise<void>;
  /** Mengganti isi kepemilikan dari data server yang sudah diambil pihak lain. */
  hydrate: (upgrades: WeaponUpgradeState[]) => void;
  /** Membeli tingkat BERIKUTNYA satu statistik; tingkat tidak bisa dilompati. */
  buyUpgrade: (weaponId: string, stat: UpgradeStat) => Promise<ShopResult>;
  buyAttachment: (weaponId: string, attachmentId: string) => Promise<ShopResult>;
  equipAttachment: (weaponId: string, attachmentId: string) => Promise<ShopResult>;
  unequipSlot: (weaponId: string, slot: AttachmentSlot) => Promise<ShopResult>;
}

interface PurchaseResponse {
  weapon: WeaponUpgradeState;
  wallet: Wallet;
  transaction: CoinTransaction | null;
}

function indexUpgrades(list: WeaponUpgradeState[]): Record<string, WeaponUpgradeState> {
  return Object.fromEntries(list.map((item) => [item.weaponId, item]));
}

/** Kepemilikan upgrade satu senjata; senjata yang belum pernah di-upgrade dapat keadaan kosong. */
export function upgradeStateOf(
  upgrades: Record<string, WeaponUpgradeState>,
  weaponId: string,
): WeaponUpgradeState {
  return upgrades[weaponId] ?? emptyUpgradeState(weaponId);
}

export const useShopStore = create<ShopState>((set, get) => {
  /** Menjalankan satu aksi dengan penanda pending; aksi lain ditolak selama itu. */
  async function run(key: string, action: () => Promise<ShopResult>): Promise<ShopResult> {
    if (get().pending) return { ok: false, message: "Tunggu proses sebelumnya selesai." };
    set({ pending: key });
    try {
      return await action();
    } finally {
      set({ pending: null });
    }
  }

  function storeWeapon(weapon: WeaponUpgradeState) {
    set((state) => ({ upgrades: { ...state.upgrades, [weapon.weaponId]: weapon } }));
  }

  async function purchase(path: string, body: unknown): Promise<ShopResult> {
    const result = await apiFetch<PurchaseResponse>(path, { method: "POST", body });
    if (!result.ok) {
      // Saldo di server bisa sudah berbeda (mis. dibelanjakan di tab lain).
      if (result.code === "saldo_kurang" || result.code === "tingkat_berubah") {
        void useWalletStore.getState().load();
        void get().load();
      }
      return { ok: false, message: result.message };
    }
    storeWeapon(result.data.weapon);
    useWalletStore.getState().applyServerResult(result.data);
    return { ok: true };
  }

  return {
    upgrades: {},
    loaded: false,
    pending: null,

    load: async () => {
      const result = await apiFetch<{ upgrades: WeaponUpgradeState[] }>("/api/toko");
      if (result.ok) set({ upgrades: indexUpgrades(result.data.upgrades), loaded: true });
    },

    hydrate: (upgrades) => set({ upgrades: indexUpgrades(upgrades), loaded: true }),

    buyUpgrade: (weaponId, stat) =>
      run(`upgrade:${weaponId}:${stat}`, () =>
        purchase("/api/toko/upgrade", {
          weaponId,
          stat,
          level: upgradeStateOf(get().upgrades, weaponId).levels[stat] + 1,
        }),
      ),

    buyAttachment: (weaponId, attachmentId) =>
      run(`beli:${weaponId}:${attachmentId}`, () =>
        purchase("/api/toko/beli", { type: "attachment", weaponId, attachmentId }),
      ),

    equipAttachment: (weaponId, attachmentId) =>
      run(`pasang:${weaponId}:${attachmentId}`, async () => {
        const slot = findAttachment(attachmentId)?.slot;
        if (!slot) return { ok: false, message: "Attachment ini tidak ada di katalog." };
        const result = await apiFetch<{ weapon: WeaponUpgradeState }>("/api/toko/pasang", {
          method: "POST",
          body: { weaponId, slot, attachmentId },
        });
        if (!result.ok) return { ok: false, message: result.message };
        storeWeapon(result.data.weapon);
        return { ok: true };
      }),

    unequipSlot: (weaponId, slot) =>
      run(`lepas:${weaponId}:${slot}`, async () => {
        const result = await apiFetch<{ weapon: WeaponUpgradeState }>("/api/toko/pasang", {
          method: "POST",
          body: { weaponId, slot, attachmentId: null },
        });
        if (!result.ok) return { ok: false, message: result.message };
        storeWeapon(result.data.weapon);
        return { ok: true };
      }),
  };
});
