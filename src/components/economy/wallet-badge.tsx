"use client";

import { CoinBadge } from "@/components/economy/coin-badge";
import { useWalletStore } from "@/lib/store/wallet-store";

/** Lencana saldo yang membaca dompet klien, untuk halaman server seperti menu utama. */
export function WalletBadge({ className }: { className?: string }) {
  const balance = useWalletStore((state) => state.wallet.balance);
  const degraded = useWalletStore((state) => state.degraded);
  return <CoinBadge balance={balance} degraded={degraded} className={className} />;
}
