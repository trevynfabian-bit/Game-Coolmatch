import { create } from "zustand";
import { findAttachment } from "@/lib/economy/upgrade-catalog";
import { MOCK_WALLET, MOCK_WEAPON_UPGRADES, emptyUpgradeState } from "@/lib/mock/shop";
import { findWeapon } from "@/lib/mock/weapons";
import type { AttachmentSlot, Wallet, WeaponUpgradeState } from "@/types/economy";

/**
 * State toko di klien: saldo koin dan kepemilikan upgrade per senjata.
 *
 * Untuk fase frontend isinya data tiruan dan aksi beli/pasang diproses di
 * sini; lapisan backend nanti mengganti isi aksi dengan panggilan API yang
 * mengembalikan bentuk hasil yang sama, jadi komponen tidak berubah.
 */

export type ShopResult = { ok: true } | { ok: false; message: string };

interface ShopState {
  wallet: Wallet;
  upgrades: Record<string, WeaponUpgradeState>;
  /** Kunci aksi yang sedang diproses, supaya tombolnya bisa dimatikan. */
  pending: string | null;
  hydrate: (input: { wallet?: Wallet; upgrades?: WeaponUpgradeState[] }) => void;
  buyAttachment: (weaponId: string, attachmentId: string) => Promise<ShopResult>;
  equipAttachment: (weaponId: string, attachmentId: string) => Promise<ShopResult>;
  unequipSlot: (weaponId: string, slot: AttachmentSlot) => Promise<ShopResult>;
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

/** Jeda kecil tiruan supaya keadaan "memproses" ikut teruji sebelum ada server. */
const MOCK_LATENCY_MS = 250;
const wait = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

export const useShopStore = create<ShopState>((set, get) => {
  /** Menjalankan satu aksi dengan penanda pending; aksi lain ditolak selama itu. */
  async function run(key: string, action: () => ShopResult): Promise<ShopResult> {
    if (get().pending) return { ok: false, message: "Tunggu proses sebelumnya selesai." };
    set({ pending: key });
    try {
      await wait();
      return action();
    } finally {
      set({ pending: null });
    }
  }

  function patchWeapon(weaponId: string, patch: (s: WeaponUpgradeState) => WeaponUpgradeState) {
    set((state) => ({
      upgrades: {
        ...state.upgrades,
        [weaponId]: patch(upgradeStateOf(state.upgrades, weaponId)),
      },
    }));
  }

  return {
    wallet: { ...MOCK_WALLET },
    upgrades: indexUpgrades(MOCK_WEAPON_UPGRADES),
    pending: null,

    hydrate: ({ wallet, upgrades }) =>
      set((state) => ({
        wallet: wallet ?? state.wallet,
        upgrades: upgrades ? indexUpgrades(upgrades) : state.upgrades,
      })),

    buyAttachment: (weaponId, attachmentId) =>
      run(`beli:${weaponId}:${attachmentId}`, () => {
        const attachment = findAttachment(attachmentId);
        const weapon = findWeapon(weaponId);
        if (!attachment || !attachment.compatibleTypes.includes(weapon.type)) {
          return { ok: false, message: "Attachment ini tidak cocok untuk senjata itu." };
        }
        const current = upgradeStateOf(get().upgrades, weaponId);
        if (current.ownedAttachmentIds.includes(attachmentId)) {
          return { ok: false, message: "Attachment ini sudah kamu miliki." };
        }
        const { wallet } = get();
        if (wallet.balance < attachment.price) {
          return {
            ok: false,
            message: `Koin kurang ${attachment.price - wallet.balance} untuk membeli ${attachment.name}.`,
          };
        }
        set({ wallet: { ...wallet, balance: wallet.balance - attachment.price } });
        // Barang yang baru dibeli langsung dipasang: itu yang hampir selalu diinginkan.
        patchWeapon(weaponId, (s) => ({
          ...s,
          ownedAttachmentIds: [...s.ownedAttachmentIds, attachmentId],
          equipped: { ...s.equipped, [attachment.slot]: attachmentId },
        }));
        return { ok: true };
      }),

    equipAttachment: (weaponId, attachmentId) =>
      run(`pasang:${weaponId}:${attachmentId}`, () => {
        const attachment = findAttachment(attachmentId);
        const current = upgradeStateOf(get().upgrades, weaponId);
        if (!attachment || !current.ownedAttachmentIds.includes(attachmentId)) {
          return { ok: false, message: "Beli dulu attachment ini sebelum memasangnya." };
        }
        patchWeapon(weaponId, (s) => ({
          ...s,
          equipped: { ...s.equipped, [attachment.slot]: attachmentId },
        }));
        return { ok: true };
      }),

    unequipSlot: (weaponId, slot) =>
      run(`lepas:${weaponId}:${slot}`, () => {
        patchWeapon(weaponId, (s) => {
          const equipped = { ...s.equipped };
          delete equipped[slot];
          return { ...s, equipped };
        });
        return { ok: true };
      }),
  };
});
