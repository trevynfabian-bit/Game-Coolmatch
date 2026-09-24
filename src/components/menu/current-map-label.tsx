"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { DEFAULT_MAP, findMap } from "@/lib/mock/maps";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";

const subscribeNever = () => () => {};

/** "Peta saat ini" di menu utama; nama peta tersimpan baru dipakai sesudah hidrasi. */
export function CurrentMapLabel() {
  const mapId = useMatchSetupStore((state) => state.mapId);
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const map = hydrated ? findMap(mapId) : DEFAULT_MAP;
  return (
    <p className="mt-6 text-xs text-slate-600">
      Peta saat ini:{" "}
      <Link href="/peta" className="text-slate-400 underline-offset-2 hover:underline">
        {map.name}
      </Link>
    </p>
  );
}
