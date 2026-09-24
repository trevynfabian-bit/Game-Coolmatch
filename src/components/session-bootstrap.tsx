"use client";

import { useEffect } from "react";
import { useShopStore } from "@/lib/store/shop-store";
import { useWalletStore } from "@/lib/store/wallet-store";

/**
 * Memuat data pemain yang tersimpan di server begitu sesi dibuka: saldo koin
 * dan upgrade senjata. Dipasang sekali di layout akar, jadi halaman mana pun
 * yang dibuka pertama kali — menu, toko, atau langsung arena — sudah memakai
 * progres terakhir pemain.
 */
export function SessionBootstrap() {
  useEffect(() => {
    void useWalletStore.getState().load();
    void useShopStore.getState().load();
  }, []);
  return null;
}
