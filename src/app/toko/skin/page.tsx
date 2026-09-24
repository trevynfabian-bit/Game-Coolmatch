import type { Metadata } from "next";
import { SkinShop } from "@/components/skins/skin-shop";

export const metadata: Metadata = {
  title: "Toko Skin & Camo — Arena Tembak Simple",
  description:
    "Skin senjata bertingkat dari umum sampai gold, termasuk camo bertema bendera berbagai negara.",
};

export default function SkinShopPage() {
  return (
    <main className="min-h-dvh">
      <SkinShop />
    </main>
  );
}
