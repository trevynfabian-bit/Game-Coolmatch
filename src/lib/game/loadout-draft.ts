import type { KillstreakId } from "@/lib/game/killstreak";

export type LoadoutSlotsDraft = (KillstreakId | null)[];

/**
 * Memasang `id` di slot `index`. Bila hadiah itu sudah ada di slot lain,
 * kedua slot bertukar isi — jadi satu hadiah tidak pernah terpasang dua kali
 * dan pemain tidak perlu mengosongkan slot lain dulu.
 */
export function assignSlot(slots: LoadoutSlotsDraft, index: number, id: KillstreakId | null): LoadoutSlotsDraft {
  const next = [...slots];
  const previous = next[index] ?? null;
  const elsewhere = id ? next.findIndex((slot, i) => slot === id && i !== index) : -1;
  next[index] = id;
  if (elsewhere >= 0) next[elsewhere] = previous;
  return next;
}

export function sameLoadout(a: LoadoutSlotsDraft, b: LoadoutSlotsDraft): boolean {
  return a.length === b.length && a.every((slot, index) => slot === b[index]);
}
