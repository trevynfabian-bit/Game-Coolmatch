"use client";

import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { controlHints } from "@/lib/game/keybinds";
import { useKeybindStore } from "@/lib/store/keybind-store";
import { difficultyProfile } from "@/lib/game/difficulty";
import { restartMatch } from "@/lib/game/match-reset";
import { usePlayerStore } from "@/lib/store/player-store";
import type { MatchSnapshot, RoundState } from "@/types/game";

/** Satu keterangan ringkas pada baris di bawah judul. */
function Fact({ children }: { children: React.ReactNode }) {
  return <span className="text-slate-300">{children}</span>;
}

/**
 * Lapisan yang menutup arena selama kursor belum dikunci. Browser hanya mau
 * mengunci pointer sesudah gerakan pengguna, jadi halaman selalu mulai di sini.
 * Tombolnya sekadar sasaran klik yang jelas — drei PointerLockControls sendiri
 * menyimak klik di level document.
 *
 * Isinya berbeda menurut keadaan pertandingan, dan itulah yang menyambungkan
 * layar "Atur Lawan" dengan arena: sebelum pertandingan dimulai, layar ini
 * membacakan kembali pilihan yang tadi dibuat pemain — peta, jumlah musuh,
 * tingkat kesulitan, dan aturan rondenya — supaya jelas pertandingan seperti
 * apa yang sedang ia masuki. Sesudah pertandingan berjalan, layar yang sama
 * berubah jadi layar jeda yang menunjukkan posisi ronde saat ini.
 *
 * Layar jeda juga satu-satunya tempat pemain bisa MENINGGALKAN pertandingan
 * yang sedang berjalan. Sebelum ada tombolnya, menekan Esc hanya menawarkan
 * satu pilihan — kembali bertanding — dan pemain yang ingin berhenti harus
 * memakai tombol back browser. Mengulang dari awal juga tidak mungkin tanpa
 * menyelesaikan pertandingannya lebih dulu.
 */
export function EngageOverlay({
  round,
  match,
}: {
  round: RoundState;
  match: MatchSnapshot;
}) {
  const isLocked = usePlayerStore((state) => state.isLocked);
  const hints = controlHints(useKeybindStore((state) => state.bindings));

  // Pertandingan usai punya layarnya sendiri; jangan tumpuk dengan ajakan main.
  if (isLocked || round.status === "ended") return null;

  const isStart = round.status === "warmup";
  const profile = difficultyProfile(match.difficulty);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-slate-950/70 px-6 backdrop-blur-[2px]">
      {/*
        Selebar max-w-md, bukan max-w-sm: tiga tombol keluar di bawah harus
        muat sebaris tanpa teksnya terpotong jadi dua baris.
      */}
      <div className="w-full max-w-md text-center">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          {isStart ? "Bersiap" : "Jeda"}
        </p>

        <h2 className="mt-3 text-2xl font-bold text-white">{match.map.name}</h2>

        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-500">
          {isStart ? (
            <>
              <Fact>{match.botCount} musuh otomatis</Fact>
              <span>·</span>
              <Fact>tingkat {profile.label.toLowerCase()}</Fact>
              <span>·</span>
              <Fact>{round.total} ronde</Fact>
              <span>·</span>
              <Fact>batas {round.scoreLimit} kill</Fact>
            </>
          ) : (
            <>
              <Fact>
                Ronde {round.current} dari {round.total}
              </Fact>
              <span>·</span>
              <Fact>
                <span className="font-mono tabular-nums">
                  {Math.max(0, round.secondsLeft)}s
                </span>{" "}
                tersisa
              </Fact>
            </>
          )}
        </p>

        {/*
          Tombol ini sengaja TIDAK menghentikan rambatan kliknya: justru klik
          yang sampai ke document itulah yang membuat PointerLockControls
          mengunci kursor dan pertandingan berjalan. Ia hanya sasaran klik yang
          jelas — mengklik di mana pun pada lapisan ini berfungsi sama.
        */}
        <button
          type="button"
          className="pointer-events-auto mt-5 rounded-lg bg-emerald-500 px-7 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {isStart ? "Klik untuk main" : "Klik untuk lanjut"}
        </button>

        <dl className="mx-auto mt-7 grid max-w-[18rem] grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left">
          {hints.map((hint) => (
            <div key={hint.keys} className="contents">
              <dt className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-center font-mono text-[11px] whitespace-nowrap text-slate-200">
                {hint.keys}
              </dt>
              <dd className="self-center text-xs text-slate-400">
                {hint.label}
              </dd>
            </div>
          ))}
        </dl>

        {/*
          Berbeda dengan tombol di atas, tombol-tombol ini menghentikan
          rambatan kliknya (ditangani ActionButton) supaya menekan "Kembali ke
          menu" tidak sekaligus mengunci kursor dan melanjutkan pertandingan.
        */}
        {/*
          Dua baris berisi dua, bukan satu baris berisi empat: lapisan ini
          hanya selebar max-w-md, dan tombol keempat memaksa teksnya pecah.

          Yang ditawarkan berbeda menurut keadaannya, dan bukan sekadar demi
          muat. Layar BERSIAP adalah layar persiapan terakhir sebelum bertanding,
          jadi di situlah "Ganti peta" berguna. Layar JEDA ada di tengah
          pertandingan yang sedang berjalan; yang dibutuhkan di sana adalah
          mengulang dari awal, dan peta tetap bisa dicapai lewat Ganti lawan
          yang menuju layar persiapan.

          "Pengaturan" ada di keduanya. Justru di sinilah pemain menyadari
          gerakannya tersendat atau bidikannya terlalu sensitif — dan sebelum
          ini, satu-satunya jalan ke sana adalah lewat menu utama.
        */}
        <ActionRow className="pointer-events-auto mt-7">
          {isStart ? (
            <ActionButton size="ringkas" href="/peta">
              Ganti peta
            </ActionButton>
          ) : (
            <ActionButton
              size="ringkas"
              onClick={() => restartMatch(match.map, match)}
            >
              Ulangi dari awal
            </ActionButton>
          )}
          <ActionButton size="ringkas" href="/lawan">
            Ganti lawan
          </ActionButton>
        </ActionRow>
        <ActionRow className="pointer-events-auto mt-2">
          <ActionButton size="ringkas" href="/pengaturan">
            Pengaturan
          </ActionButton>
          <ActionButton size="ringkas" href="/">
            Kembali ke menu
          </ActionButton>
        </ActionRow>

        <p className="mt-6 text-[11px] leading-relaxed text-slate-500">
          {isStart
            ? "Jam ronde baru berjalan begitu kamu masuk arena, jadi tidak ada detik yang terbuang selagi membaca ini."
            : "Musuh dan jam ronde ikut berhenti selama jeda — pertandingan menunggu sampai kamu kembali."}
        </p>
      </div>
    </div>
  );
}
