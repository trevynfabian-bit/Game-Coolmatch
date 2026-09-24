import type { Metadata } from "next";
import { RewardLoadoutPage } from "@/components/rewards/reward-loadout-page";

export const metadata: Metadata = {
  title: "Loadout Hadiah — Arena Tembak Simple",
  description: "Pilih hadiah killstreak yang dibawa ke arena: Radar UAV, Serangan Udara, dan Helikopter Dukungan.",
};

export default function RewardLoadoutRoute() {
  return (
    <main className="min-h-dvh">
      <RewardLoadoutPage />
    </main>
  );
}
