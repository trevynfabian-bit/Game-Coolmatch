import type { Fighter, RoundState } from "@/types/game";

/**
 * Kapan seorang petarung yang tumbang akan kembali, menurut aturan ronde.
 *
 * Hitung mundur respawn hanya berjalan selama ronde berlangsung, dan
 * pergantian ronde menghidupkan semua orang sekaligus. Dua akibatnya yang
 * harus dikatakan jujur kepada pemain: tumbang saat sisa ronde lebih pendek
 * dari hitung mundurnya berarti baru kembali di ronde berikutnya, bukan
 * "dalam 4 detik"; dan tumbang lalu ronde berakhir berarti hitung mundur
 * yang membeku di jeda ronde bukan angka yang sedang berjalan. Sesudah
 * pertandingan selesai tidak ada yang kembali sama sekali.
 */
export type RespawnOutlook =
  | { kind: "alive" }
  | { kind: "countdown"; seconds: number }
  | { kind: "nextRound" }
  | { kind: "never" };

export function respawnOutlook(
  fighter: Pick<Fighter, "isAlive" | "respawnInSeconds">,
  round: Pick<RoundState, "status" | "secondsLeft">,
): RespawnOutlook {
  if (fighter.isAlive) return { kind: "alive" };
  if (round.status === "ended") return { kind: "never" };
  if (round.status === "intermission") return { kind: "nextRound" };
  const seconds = Math.max(0, fighter.respawnInSeconds ?? 0);
  // Hitung mundurnya lebih panjang dari sisa ronde: ronde akan berganti dulu.
  if (round.status === "live" && seconds > round.secondsLeft) {
    return { kind: "nextRound" };
  }
  return { kind: "countdown", seconds };
}

/** Kalimat untuk panel nyawa pemain; null bila petarung masih hidup. */
export function respawnSentence(outlook: RespawnOutlook): string | null {
  switch (outlook.kind) {
    case "alive":
      return null;
    case "countdown":
      return `Muncul lagi dalam ${outlook.seconds}s`;
    case "nextRound":
      return "Muncul lagi di ronde berikutnya";
    case "never":
      return "Pertandingan selesai";
  }
}

/** Keterangan pendek untuk papan nama di atas kepala; null bila masih hidup. */
export function respawnTag(outlook: RespawnOutlook): string | null {
  switch (outlook.kind) {
    case "alive":
      return null;
    case "countdown":
      return `respawn ${outlook.seconds}s`;
    case "nextRound":
      return "ronde berikutnya";
    case "never":
      return null;
  }
}
