import { KillstreakIcon } from "@/components/arena/hud/killstreak-tracker";
import { CoinIcon } from "@/components/economy/coin-badge";
import { SkinnedWeapon } from "@/components/skins/skinned-weapon";
import { findSkin } from "@/lib/economy/skin-catalog";
import { findWeapon } from "@/lib/mock/weapons";
import type { RewardNotification } from "@/types/economy";

/** Ikon notifikasi sesuai jenisnya, digambar tanpa aset eksternal. */
export function NotificationIcon({ item }: { item: RewardNotification }) {
  switch (item.kind) {
    case "koin":
      return <CoinIcon className="h-7 w-7" />;
    case "hadiah":
      return (
        <span className="text-lime-300">
          <KillstreakIcon id={item.itemId ?? "uav"} className="h-7 w-7" />
        </span>
      );
    case "skin":
      return <SkinnedWeapon type="rifle" skin={findSkin(item.itemId)} className="h-7 w-12" />;
    case "upgrade":
    case "senjata":
      return (
        <span className={item.kind === "upgrade" ? "text-sky-300" : "text-emerald-300"}>
          <SkinnedWeapon type={findWeapon(item.itemId ?? "").type} skin={null} className="h-7 w-12" />
        </span>
      );
  }
}
