import type { Metadata } from "next";
import { UpgradeShop } from "@/components/shop/upgrade-shop";

export const metadata: Metadata = {
  title: "Toko Upgrade — Arena Tembak Simple",
  description:
    "Tingkatkan kerusakan, akurasi, dan kecepatan isi ulang senjata, atau pasang attachment, memakai koin hasil bertanding.",
};

export default function ShopPage() {
  return (
    <main className="min-h-dvh">
      <UpgradeShop />
    </main>
  );
}
