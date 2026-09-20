"use client";

import { useMemo } from "react";
import { RoundResultStrip } from "@/components/scoreboard/round-result-strip";
import { DEFAULT_PLAYER_NAME } from "@/lib/game/player-name";
import {
  ScoreRow,
  ScoreTableHead,
  scoreRowFromFighter,
} from "@/components/scoreboard/score-row";
import { PlayerStatTiles } from "@/components/scoreboard/stat-tile";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { WinnerIndicator } from "@/components/scoreboard/winner-indicator";
import { restartMatch } from "@/lib/game/match-reset";
import {
  findTiedLeaders,
  formatDuration,
  killRatio,
} from "@/lib/game/scoreboard";
import type {
  ArenaMapInfo,
  Fighter,
  MatchResult,
  MatchRoundResult,
  MatchSnapshot,
  RoundState,
} from "@/types/game";

/** Kata untuk hasil akhir dari sudut pandang pemain. */
const RESULT_LABEL: Record<MatchResult, string> = {
  menang: "Kamu menang",
  kalah: "Kamu kalah",
  seri: "Seri",
  ditinggal: "Ditinggalkan",
};

/**
 * Ringkasan akhir pertandingan.
 *
 * Isinya disusun dari yang paling ingin diketahui pemain ke yang paling rinci:
 * siapa juaranya, apa yang IA sendiri capai, bagaimana jalannya pertandingan
 * ronde demi ronde, lalu klasemen lengkap semua peserta. Urutan itu penting —
 * sebelumnya layar ini langsung melompat dari judul juara ke tabel enam kolom,
 * dan pemain harus mencari barisnya sendiri untuk tahu ia bermain sebagus apa.
 *
 * Bentuk dan komponennya sama dengan rincian pertandingan di halaman Skor,
 * sebab keduanya menjawab pertanyaan yang sama; bedanya hanya yang satu muncul
 * begitu peluit berbunyi dan yang lain bisa dibuka lagi kapan saja.
 *
 * Kursor sengaja sudah dilepas saat pertandingan usai (lihat RoundTicker),
 * jadi tombol di sini bisa diklik langsung. Kliknya dihentikan agar tidak
 * merambat ke document, tempat PointerLockControls menyimak dan akan mencoba
 * mengunci kursor kembali di saat yang salah.
 */
export function MatchEndScreen({
  round,
  fighters,
  map,
  snapshot,
  roundResults,
  matchResult = null,
  startedAt,
  endedAt,
  isTrial = false,
}: {
  round: RoundState;
  fighters: Fighter[];
  map: ArenaMapInfo;
  snapshot: MatchSnapshot;
  /**
   * Catatan jalannya pertandingan, dikumpulkan store selama ronde berlangsung;
   * `round` sendiri hanya tahu ronde yang SEDANG berjalan. Dioper sebagai prop
   * seperti seluruh data lain di layar ini, bukan dibaca langsung dari store —
   * ArenaHud yang berlangganan, dan komponen ini tetap bisa dirender dengan
   * data apa pun.
   */
  roundResults: MatchRoundResult[];
  /** Hasil akhir dari sudut pandang pemain, sebagaimana disimpulkan sesi. */
  matchResult?: MatchResult | null;
  /** Epoch milidetik mulai dan selesai; nol/null berarti jamnya tidak terisi. */
  startedAt: number;
  endedAt: number | null;
  /**
   * Benar bila pertandingan ini uji coba senjata. Layar ini memakai kata-kata
   * pertandingan sungguhan — "juara", "ringkasan akhir" — jadi tanpa penanda
   * itu, hasil satu ronde tujuh kill akan terbaca sebagai hasil pertandingan
   * penuh yang aneh pendeknya.
   */
  isTrial?: boolean;
}) {
  const ranked = useMemo(
    () =>
      [...fighters].sort(
        (a, b) =>
          b.roundWins - a.roundWins ||
          b.score - a.score ||
          b.kills - a.kills ||
          a.deaths - b.deaths,
      ),
    [fighters],
  );

  const tiedLeaders = useMemo(
    () =>
      round.matchWinner
        ? []
        : findTiedLeaders(
            fighters.map((fighter) => ({
              name: fighter.name,
              roundWins: fighter.roundWins,
              score: fighter.score,
              kills: fighter.kills,
              deaths: fighter.deaths,
            })),
          ),
    [round.matchWinner, fighters],
  );

  if (round.status !== "ended") return null;

  const local = fighters.find((fighter) => fighter.isLocal);
  // Potret pertandingan sudah membawa nama pemain, jadi tidak ada yang perlu
  // dibaca lagi dari penyimpanan di sini.
  const localName = local?.name ?? DEFAULT_PLAYER_NAME;
  const playerWon = Boolean(local && round.matchWinner === localName);

  /**
   * Pertandingan bisa ditutup sebelum ronde terakhir, yaitu saat keunggulan
   * juaranya sudah tidak mungkin disusul. Tanpa keterangan ini pemain hanya
   * melihat pertandingan lima ronde yang tiba-tiba berhenti di ronde ketiga
   * dan mengira ada yang rusak.
   */
  const clinchedEarly =
    Boolean(round.matchWinner) && round.current < round.total;

  /**
   * Durasi hanya ditampilkan bila jamnya memang terisi dan menghasilkan angka
   * yang berarti. Pertandingan yang dimuat dari potret siap pakai belum tentu
   * punya waktu mulai, dan "0 detik" lebih membingungkan daripada tidak
   * menyebutkan durasinya sama sekali.
   */
  const elapsed =
    startedAt > 0 && endedAt ? Math.round((endedAt - startedAt) / 1000) : 0;
  const durationSeconds = elapsed > 0 ? elapsed : null;

  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-slate-950/85 px-4 py-8 backdrop-blur-sm">
      {/*
        Selebar max-w-2xl, bukan max-w-lg. Layar ini memuat tabel enam kolom
        DAN empat tombol tindakan; pada lebar sebelumnya teks tombolnya pecah
        jadi dua baris masing-masing.
      */}
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <p
            className={`text-[10px] tracking-[0.3em] uppercase ${
              playerWon ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            Ringkasan akhir
          </p>
          <div className="mt-3">
            <WinnerIndicator
              localName={localName}
              winnerName={round.matchWinner}
              tiedNames={tiedLeaders}
              size="lg"
            />
          </div>
          {matchResult ? (
            <p
              className={`mt-2 text-xs font-semibold tracking-[0.2em] uppercase ${
                matchResult === "menang" ? "text-emerald-300" : "text-slate-300"
              }`}
              data-hasil={matchResult}
            >
              {RESULT_LABEL[matchResult]}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-slate-400">
            {map.name}
            <span className="text-slate-600"> · </span>
            {round.current} dari {round.total} ronde
            <span className="text-slate-600"> · </span>
            batas {round.scoreLimit} kill
            {durationSeconds === null ? null : (
              <>
                <span className="text-slate-600"> · </span>
                {formatDuration(durationSeconds)}
              </>
            )}
          </p>

          {isTrial ? (
            <p className="mt-2 text-xs text-amber-200/80">
              Ini pertandingan uji coba, bukan pertandingan penuh — aturannya
              sengaja dipendekkan supaya kamu cepat merasakan senjatanya.
            </p>
          ) : null}

          {clinchedEarly ? (
            <p className="mt-2 text-xs text-amber-200/80">
              Gelar terkunci di ronde {round.current} — sisa{" "}
              {round.total - round.current} ronde sudah tidak bisa mengubah
              juaranya.
            </p>
          ) : null}
        </div>

        {local ? (
          <div className="mt-6">
            <p className="mb-2 text-[9px] tracking-[0.15em] text-slate-500 uppercase">
              Perolehanmu
            </p>
            <PlayerStatTiles
              roundWins={local.roundWins}
              kills={local.kills}
              deaths={local.deaths}
              ratio={killRatio(local.kills, local.deaths)}
              score={local.score}
            />
          </div>
        ) : null}

        {roundResults.length > 0 ? (
          <div className="mt-6">
            <RoundResultStrip rounds={roundResults} localName={localName} />
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
          <table className="w-full text-left">
            <ScoreTableHead rank />
            <tbody>
              {ranked.map((fighter, index) => (
                <ScoreRow
                  key={fighter.id}
                  rank={index + 1}
                  entry={scoreRowFromFighter(fighter, {
                    matchEnded: true,
                    starTitle:
                      round.matchWinner === fighter.name ? "Juara" : null,
                  })}
                />
              ))}
            </tbody>
          </table>
        </div>

        <ActionRow className="mt-6">
          <ActionButton
            variant="utama"
            size="ringkas"
            onClick={() => restartMatch(map, snapshot)}
          >
            Main lagi
          </ActionButton>
          {/*
            Menutup lingkaran: dari hasil pertandingan langsung kembali ke
            layar yang menentukan lawannya. Tanpa ini, pemain yang baru saja
            kewalahan melawan enam musuh Susah harus lewat menu utama dulu
            hanya untuk menurunkan tingkat kesulitan.
          */}
          <ActionButton size="ringkas" href="/lawan">
            Ganti lawan
          </ActionButton>
          <ActionButton size="ringkas" href="/skor">
            Papan skor
          </ActionButton>
          <ActionButton size="ringkas" href="/">
            Kembali ke menu
          </ActionButton>
        </ActionRow>

        <p className="mt-4 text-center text-[11px] text-slate-600">
          &ldquo;Main lagi&rdquo; memakai pengaturan yang sama; &ldquo;Ganti
          lawan&rdquo; membuka lagi pilihan tingkat kesulitan dan jumlah musuh;
          &ldquo;Papan skor&rdquo; menyimpan seluruh riwayat bertandingmu.
        </p>
      </div>
    </div>
  );
}
