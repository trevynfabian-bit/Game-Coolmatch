import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  coinTransactions,
  coinWallets,
  matchScores,
  matches,
  type CoinTransactionKind,
  type CoinTransactionRow,
  type MatchRow,
} from "@/server/db/schema";
import {
  DIFFICULTY_MULTIPLIER,
  calculateMatchCoins,
  type CoinLine,
  type MatchCoinReward,
} from "@/lib/economy/coin-rules";
import { findMap } from "@/lib/mock/maps";
import { recordNotification } from "@/server/services/notification-service";

/**
 * Layanan dompet koin: satu-satunya jalan untuk mengubah saldo pemain.
 *
 * Setiap perubahan saldo SELALU ditulis bersamaan dengan baris
 * `coin_transactions` di dalam satu transaksi database, sehingga saldo dan
 * riwayatnya tidak pernah berselisih. better-sqlite3 menjalankan transaksi
 * secara sinkron, jadi dua permintaan tidak bisa saling menyela di tengahnya.
 */

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export class CoinError extends Error {
  constructor(
    public readonly code:
      | "saldo_kurang"
      | "pertandingan_tidak_ada"
      | "pertandingan_belum_selesai"
      | "jumlah_tidak_sah",
    message: string,
  ) {
    super(message);
    this.name = "CoinError";
  }
}

export interface WalletView {
  balance: number;
  lifetimeEarned: number;
  updatedAt: number;
}

export interface CoinTransactionView {
  id: number;
  kind: CoinTransactionKind;
  amount: number;
  balanceAfter: number;
  sourceType: string | null;
  sourceId: string | null;
  note: string;
  createdAt: number;
}

function toView(row: CoinTransactionRow): CoinTransactionView {
  return {
    id: row.id,
    kind: row.kind,
    amount: row.amount,
    balanceAfter: row.balanceAfter,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    note: row.note,
    createdAt: row.createdAt,
  };
}

/** Membuat dompet kosong bila pemain belum punya. Aman dipanggil berulang. */
function ensureWallet(tx: Tx | Db, playerId: number) {
  tx.insert(coinWallets).values({ playerId }).onConflictDoNothing().run();
  return tx
    .select()
    .from(coinWallets)
    .where(eq(coinWallets.playerId, playerId))
    .get()!;
}

export function getWallet(playerId: number): WalletView {
  const wallet = ensureWallet(db, playerId);
  return {
    balance: wallet.balance,
    lifetimeEarned: wallet.lifetimeEarned,
    updatedAt: wallet.updatedAt,
  };
}

export function listTransactions(
  playerId: number,
  { limit = 30, beforeId }: { limit?: number; beforeId?: number } = {},
): CoinTransactionView[] {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const rows = db
    .select()
    .from(coinTransactions)
    .where(
      beforeId
        ? and(
            eq(coinTransactions.playerId, playerId),
            sql`${coinTransactions.id} < ${beforeId}`,
          )
        : eq(coinTransactions.playerId, playerId),
    )
    .orderBy(desc(coinTransactions.id))
    .limit(safeLimit)
    .all();
  return rows.map(toView);
}

interface Mutation {
  kind: CoinTransactionKind;
  amount: number;
  sourceType?: string | null;
  sourceId?: string | null;
  note?: string;
}

/**
 * Menerapkan satu mutasi di dalam transaksi yang sudah terbuka.
 *
 * Mengembalikan null bila mutasi dengan sumber yang sama sudah pernah tercatat
 * (indeks unik `coin_transactions_sumber_unik`), jadi pemanggilan ulang yang
 * tidak sengaja tidak menggandakan koin.
 */
export function applyMutation(
  tx: Tx,
  playerId: number,
  mutation: Mutation,
): CoinTransactionView | null {
  if (!Number.isInteger(mutation.amount) || mutation.amount === 0) {
    throw new CoinError("jumlah_tidak_sah", "Jumlah koin harus bilangan bulat bukan nol.");
  }

  const wallet = ensureWallet(tx, playerId);

  if (mutation.sourceId != null) {
    const existing = tx
      .select({ id: coinTransactions.id })
      .from(coinTransactions)
      .where(
        and(
          eq(coinTransactions.playerId, playerId),
          eq(coinTransactions.kind, mutation.kind),
          mutation.sourceType == null
            ? isNull(coinTransactions.sourceType)
            : eq(coinTransactions.sourceType, mutation.sourceType),
          eq(coinTransactions.sourceId, mutation.sourceId),
        ),
      )
      .get();
    if (existing) return null;
  }

  const balanceAfter = wallet.balance + mutation.amount;
  if (balanceAfter < 0) {
    throw new CoinError(
      "saldo_kurang",
      `Koin tidak cukup: butuh ${-mutation.amount}, saldo ${wallet.balance}.`,
    );
  }

  tx.update(coinWallets)
    .set({
      balance: balanceAfter,
      lifetimeEarned:
        wallet.lifetimeEarned + (mutation.amount > 0 ? mutation.amount : 0),
      updatedAt: Date.now(),
    })
    .where(eq(coinWallets.playerId, playerId))
    .run();

  const row = tx
    .insert(coinTransactions)
    .values({
      playerId,
      kind: mutation.kind,
      amount: mutation.amount,
      balanceAfter,
      sourceType: mutation.sourceType ?? null,
      sourceId: mutation.sourceId ?? null,
      note: mutation.note ?? "",
      createdAt: Date.now(),
    })
    .returning()
    .get();

  return toView(row);
}

/**
 * Mengurangi koin untuk pembelian. Melempar CoinError("saldo_kurang") bila
 * saldo tidak cukup; tidak ada yang tertulis dalam kasus itu.
 *
 * `onPaid` dijalankan di transaksi yang sama, jadi pencatatan barang yang
 * dibeli ikut batal bila pembayarannya gagal — dan sebaliknya.
 */
export function spendCoins<T>(
  playerId: number,
  input: Mutation & { amount: number },
  onPaid?: (tx: Tx) => T,
): { transaction: CoinTransactionView | null; wallet: WalletView; result?: T } {
  if (input.amount <= 0) {
    throw new CoinError("jumlah_tidak_sah", "Harga harus lebih dari nol.");
  }
  return db.transaction((tx) => {
    const transaction = applyMutation(tx, playerId, {
      ...input,
      amount: -input.amount,
    });
    const result = onPaid ? onPaid(tx) : undefined;
    const wallet = ensureWallet(tx, playerId);
    return {
      transaction,
      wallet: {
        balance: wallet.balance,
        lifetimeEarned: wallet.lifetimeEarned,
        updatedAt: wallet.updatedAt,
      },
      result,
    };
  });
}

export interface MatchCoinAward {
  matchId: number;
  reward: MatchCoinReward;
  /** Benar bila koin pertandingan ini sudah pernah dibayarkan sebelumnya. */
  alreadyAwarded: boolean;
  /** Benar bila pertandingan ini latihan/uji coba sehingga tidak berhak koin. */
  excluded: boolean;
  wallet: WalletView;
}

/**
 * Membayar koin sebuah pertandingan yang sudah selesai.
 *
 * Fakta hasil (juara, kill, ronde menang) dibaca dari baris `matches` dan
 * `match_scores` yang ditulis server, bukan dari klien. Satu-satunya fakta yang
 * diterima dari klien adalah kill beruntun terpanjang, dan itu dijepit ke total
 * kill sehingga tidak bisa digelembungkan.
 *
 * Tiap baris rincian dicatat sebagai transaksi terpisah bersumber
 * ("match", id), sehingga memanggil ulang untuk pertandingan yang sama tidak
 * menambah koin lagi.
 */
export function awardMatchCoins(
  playerId: number,
  matchId: number,
  { bestStreak = 0 }: { bestStreak?: number } = {},
): MatchCoinAward {
  return db.transaction((tx) => {
    const match = tx
      .select()
      .from(matches)
      .where(and(eq(matches.id, matchId), eq(matches.playerId, playerId)))
      .get();
    if (!match) {
      throw new CoinError("pertandingan_tidak_ada", "Pertandingan tidak ditemukan.");
    }
    if (match.endedAt == null || match.result == null) {
      throw new CoinError(
        "pertandingan_belum_selesai",
        "Koin baru bisa diberikan setelah pertandingan selesai.",
      );
    }

    // Latihan dan uji coba senjata tidak pernah menghasilkan koin, apa pun
    // perolehannya — kalau tidak, lorong sasaran bisa dipakai memanen koin.
    if (match.isTrial) {
      const wallet = ensureWallet(tx, playerId);
      return {
        matchId,
        reward: { lines: [], multiplier: 0, total: 0 },
        alreadyAwarded: false,
        excluded: true,
        wallet: {
          balance: wallet.balance,
          lifetimeEarned: wallet.lifetimeEarned,
          updatedAt: wallet.updatedAt,
        },
      };
    }

    const score = tx
      .select()
      .from(matchScores)
      .where(and(eq(matchScores.matchId, matchId), eq(matchScores.isBot, false)))
      .get();

    const reward = calculateMatchCoins({
      outcome: match.result,
      difficulty: match.difficulty,
      kills: score?.kills ?? 0,
      roundWins: score?.roundWins ?? 0,
      bestStreak,
    });

    let alreadyAwarded = reward.lines.length > 0;
    for (const line of reward.lines) {
      const written = applyMutation(tx, playerId, {
        kind: line.kind,
        amount: line.amount,
        sourceType: "match",
        sourceId: String(matchId),
        note: line.label,
      });
      if (written) alreadyAwarded = false;
    }

    // Rincian yang dikembalikan diambil dari yang BENAR-BENAR tercatat, supaya
    // pemanggilan ulang dengan fakta berbeda tidak menampilkan angka palsu.
    const lines = recordedMatchLines(tx, playerId, matchId);
    const total = lines.reduce((sum, line) => sum + line.amount, 0);

    // Koin yang baru saja masuk diumumkan di kotak masuk hadiah, dalam
    // transaksi yang sama supaya koin dan notifikasinya tidak berselisih.
    if (!alreadyAwarded && total > 0) {
      recordNotification(
        {
          playerId,
          kind: "koin",
          title: `+${total} koin dari pertandingan`,
          body: matchCoinBody(match, lines),
          amount: total,
          sourceId: `pertandingan:${matchId}`,
        },
        tx,
      );
    }

    const wallet = ensureWallet(tx, playerId);
    return {
      matchId,
      reward: {
        lines,
        multiplier: reward.multiplier,
        total,
      },
      alreadyAwarded,
      excluded: false,
      wallet: {
        balance: wallet.balance,
        lifetimeEarned: wallet.lifetimeEarned,
        updatedAt: wallet.updatedAt,
      },
    };
  });
}

/** Baris koin sebuah pertandingan yang benar-benar tercatat, urut pencatatan. */
function recordedMatchLines(executor: Tx | Db, playerId: number, matchId: number): CoinLine[] {
  return executor
    .select()
    .from(coinTransactions)
    .where(
      and(
        eq(coinTransactions.playerId, playerId),
        eq(coinTransactions.sourceType, "match"),
        eq(coinTransactions.sourceId, String(matchId)),
      ),
    )
    .orderBy(coinTransactions.id)
    .all()
    .filter((row) => row.amount > 0)
    .map((row) => ({
      kind: row.kind as CoinLine["kind"],
      label: row.note,
      amount: row.amount,
    }));
}

const RESULT_WORD: Record<NonNullable<MatchRow["result"]>, string> = {
  menang: "Menang",
  kalah: "Kalah",
  seri: "Seri",
  ditinggal: "Ditinggal",
};

/** Isi notifikasi koin: hasil, peta, lalu rincian bonusnya. */
function matchCoinBody(match: MatchRow, lines: CoinLine[]): string {
  const head = `${match.result ? RESULT_WORD[match.result] : "Selesai"} di ${findMap(match.mapId).name}`;
  const extras = lines.filter((line) => line.kind !== "pertandingan").map((line) => line.label);
  return extras.length > 0 ? `${head}: ${extras.join(", ")}.` : `${head}.`;
}

export type MatchCoinStatus = "berlangsung" | "dibayar" | "tanpa_koin" | "uji_coba";

export interface MatchCoinSummary {
  matchId: number;
  /**
   * berlangsung: belum selesai; dibayar: koin sudah masuk dompet;
   * tanpa_koin: selesai tapi tidak berhak (mis. ditinggal); uji_coba: latihan.
   */
  status: MatchCoinStatus;
  result: MatchRow["result"];
  difficulty: MatchRow["difficulty"];
  multiplier: number;
  lines: CoinLine[];
  total: number;
  endedAt: number | null;
}

/**
 * Ringkasan koin sebuah pertandingan milik pemain, hanya baca: rincian yang
 * tercatat di buku besar koin, bukan hitungan ulang. Dipakai layar akhir,
 * riwayat, dan kotak masuk hadiah.
 */
export function getMatchCoinSummary(playerId: number, matchId: number): MatchCoinSummary {
  const match = db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.playerId, playerId)))
    .get();
  if (!match) throw new CoinError("pertandingan_tidak_ada", "Pertandingan tidak ditemukan.");

  const lines = match.isTrial ? [] : recordedMatchLines(db, playerId, matchId);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const status: MatchCoinStatus = match.isTrial
    ? "uji_coba"
    : match.endedAt == null
      ? "berlangsung"
      : total > 0
        ? "dibayar"
        : "tanpa_koin";
  return {
    matchId,
    status,
    result: match.result,
    difficulty: match.difficulty,
    multiplier: match.isTrial ? 0 : (DIFFICULTY_MULTIPLIER[match.difficulty] ?? 1),
    lines,
    total,
    endedAt: match.endedAt,
  };
}
