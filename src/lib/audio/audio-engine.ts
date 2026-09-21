import {
  COMBAT_CHANNELS,
  DEFAULT_COMBAT_MIX,
  channelLevels,
  type CombatChannel,
} from "@/lib/game/combat-audio";
import { EMPTY_VOICE, emptyClickAllowed } from "@/lib/audio/empty-voice";
import { reloadSequence } from "@/lib/audio/reload-voice";
import {
  SHOT_VOICE,
  shotDistanceMix,
  shotPan,
  type ShotVoice,
} from "@/lib/audio/shot-voice";
import type { WeaponType } from "@/types/game";

/**
 * Mesin suara permainan.
 *
 * Seluruh bunyinya DIBANGKITKAN, bukan dimuat dari berkas. Tidak ada satu pun
 * aset audio di repositori ini, dan menambahkannya berarti menambah berkas
 * besar yang harus diunduh sebelum pemain bisa main — padahal yang dibutuhkan
 * hanyalah letupan pendek, denting kena, dan dengung latar. Ketiganya bisa
 * disusun dari derau dan osilator dalam beberapa baris, dan hasilnya ikut
 * mengecil bersama bundel alih-alih membesarkannya.
 *
 * Konteks audio dibuat SETELAH ada gerakan pengguna, tidak saat modul dimuat.
 * Browser menolak memutar suara sebelum pengguna menyentuh halaman, dan
 * konteks yang dibuat lebih awal hanya akan tertidur dan tidak pernah bangun.
 */

interface Engine {
  ctx: AudioContext;
  effects: GainNode;
  music: GainNode;
  /**
   * Satu bus per kanal tempur, semuanya bermuara ke `effects`. Tembakan,
   * denting kena, dan latar arena masuk lewat bus masing-masing, jadi
   * pemain bisa memelankan letupannya sendiri tanpa kehilangan denting kena.
   */
  channels: Record<CombatChannel, GainNode>;
  noise: AudioBuffer;
  musicNodes: { stop: () => void } | null;
}

let engine: Engine | null = null;
let effectsVolume = 0;
let musicVolume = 0;
/** Pengali 0..1 tiap kanal tempur; dipegang di sini juga supaya bunyi yang
 * kanalnya nol bisa dilewati tanpa membangun node yang tidak akan terdengar. */
/**
 * Kapan ketukan magasin kosong terakhir berbunyi, pada jam konteks audio.
 * Disimpan di tingkat modul karena pembatasnya harus berlaku lintas pemanggil:
 * pemain yang menahan pelatuk memanggil fungsi yang sama puluhan kali per
 * detik, dan tidak ada satu pun dari pemanggil itu yang tahu tentang yang lain.
 */
let lastEmptyAt: number | null = null;
let channelMix: Record<CombatChannel, number> =
  channelLevels(DEFAULT_COMBAT_MIX);

/** Derau putih sepanjang dua detik, dipakai ulang untuk semua letupan. */
function buildNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * Menyiapkan konteks audio bila belum ada, lalu membangunkannya.
 *
 * Mengembalikan null di server dan pada browser tanpa Web Audio — pemanggil
 * karena itu selalu memeriksa hasilnya, dan permainan tetap berjalan tanpa
 * suara alih-alih gagal.
 */
function ensureEngine(): Engine | null {
  if (typeof window === "undefined") return null;
  if (engine) {
    if (engine.ctx.state === "suspended") void engine.ctx.resume();
    return engine;
  }

  // Safari lama masih memakai nama berawalan; dijangkau lewat pengecekan
  // bertipe alih-alih any, supaya sisa berkas ini tetap terperiksa.
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  const effects = ctx.createGain();
  const music = ctx.createGain();
  effects.gain.value = effectsVolume;
  // Musik dipelankan lagi terhadap efek. Dengung latar yang sekeras letupan
  // tembakan akan menenggelamkan langkah lawan, dan langkah lawan itulah
  // informasi yang paling berguna dalam permainan tembak-tembakan.
  music.gain.value = musicVolume * 0.3;
  effects.connect(ctx.destination);
  music.connect(ctx.destination);

  const channels = {} as Record<CombatChannel, GainNode>;
  for (const channel of COMBAT_CHANNELS) {
    const bus = ctx.createGain();
    bus.gain.value = channelMix[channel];
    bus.connect(effects);
    channels[channel] = bus;
  }

  engine = {
    ctx,
    effects,
    music,
    channels,
    noise: buildNoise(ctx),
    musicNodes: null,
  };
  return engine;
}

/** Volume efek dan musik, keduanya 0..1. */
export function setAudioVolumes(effects: number, music: number) {
  effectsVolume = effects;
  musicVolume = music;
  if (!engine) return;
  const now = engine.ctx.currentTime;
  // Diubah landai, bukan seketika: lompatan nilai gain terdengar sebagai
  // "klik" tersendiri, dan penggeser volume menghasilkan puluhan lompatan
  // saat ditarik.
  engine.effects.gain.setTargetAtTime(effects, now, 0.02);
  engine.music.gain.setTargetAtTime(music * 0.3, now, 0.05);
}

/** Pengali 0..1 tiap kanal tempur, di bawah volume efek. */
export function setCombatMix(mix: Record<CombatChannel, number>) {
  channelMix = { ...mix };
  if (!engine) return;
  const now = engine.ctx.currentTime;
  for (const channel of COMBAT_CHANNELS) {
    engine.channels[channel].gain.setTargetAtTime(mix[channel], now, 0.02);
  }
}

/**
 * Mesin beserta bus kanal yang diminta, atau null bila tidak akan terdengar:
 * tanpa Web Audio, volume efek nol, atau kanal itu sendiri dipelankan habis.
 * Setiap bunyi tempur memulai dari sini supaya aturan "kanal nol berarti
 * diam" hanya ditulis sekali.
 */
function busFor(channel: CombatChannel): (Engine & { bus: GainNode }) | null {
  const eng = ensureEngine();
  if (!eng || effectsVolume <= 0 || channelMix[channel] <= 0) return null;
  return { ...eng, bus: eng.channels[channel] };
}

/** Di mana sebuah tembakan terjadi, dilihat dari telinga pemain. */
export interface ShotOrigin {
  /** Jarak dari pemain dalam satuan arena; nol berarti senjata sendiri. */
  distance?: number;
  /**
   * Sudut penembak relatif arah pandang, radian, konvensi penunjuk arah kena:
   * nol tepat di depan, positif di sebelah kiri.
   */
  angleRad?: number;
}

/**
 * Letupan tembakan, disusun berlapis menurut watak senjatanya: desis tajam,
 * dentum rendah, ekor gema, lalu bunyi mekanik untuk senjata yang bukan
 * otomatis. Empat lapis itu yang membuat pistol, shotgun, dan sniper bisa
 * dibedakan dengan mata tertutup — jauh lebih efektif daripada sekadar
 * mengeraskan volumenya, dan itu jugalah yang memberi tahu pemain senjata apa
 * yang sedang menembaknya.
 *
 * Tembakan yang datang dari kejauhan dilemahkan, ditumpulkan, dan ditunda
 * sesuai jaraknya, lalu ditempatkan kiri-kanan sesuai arahnya. Dengan begitu
 * pemain bisa menebak di mana pertempuran sedang berlangsung sebelum
 * melihatnya.
 */
export function playShotAt(type: WeaponType, origin: ShotOrigin = {}) {
  const eng = busFor("tembakan");
  if (!eng) return;
  const { ctx, bus, noise } = eng;
  const voice: ShotVoice = SHOT_VOICE[type];

  const jauh = shotDistanceMix(origin.distance ?? 0);
  // Di luar jangkauan dengar tidak ada satu pun node yang dibangun.
  if (!jauh) return;

  /*
    Semua lapis melewati satu simpul muara: di situlah pelemahan jarak,
    penumpulan nada tinggi, dan penempatan kiri-kanan dikenakan sekali saja.
    Menaruhnya per lapis berarti empat tempat yang bisa berselisih.
  */
  const muara = ctx.createGain();
  muara.gain.value = jauh.gain;

  let ujung: AudioNode = muara;
  if (jauh.cutoff < 17000) {
    const udara = ctx.createBiquadFilter();
    udara.type = "lowpass";
    udara.frequency.value = jauh.cutoff;
    muara.connect(udara);
    ujung = udara;
  }

  // Penempatan kiri-kanan dilewati bila peramban tidak punya StereoPanner —
  // bunyinya tetap terdengar, hanya di tengah.
  const pan = shotPan(origin.angleRad ?? 0);
  if (pan !== 0 && typeof ctx.createStereoPanner === "function") {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    ujung.connect(panner).connect(bus);
  } else {
    ujung.connect(bus);
  }

  const now = ctx.currentTime + jauh.delay;

  // Lapis satu: desis tajam dari derau yang disaring.
  const crack = ctx.createBufferSource();
  crack.buffer = noise;
  crack.playbackRate.value = 0.8 + Math.random() * 0.4;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = voice.crack.cutoff;
  bandpass.Q.value = voice.crack.q;

  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(voice.crack.gain, now);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, now + voice.crack.decay);

  crack.connect(bandpass).connect(crackGain).connect(muara);
  crack.start(now, Math.random() * 1.5);
  crack.stop(now + voice.crack.decay);

  // Lapis dua: dentum rendah yang jatuh cepat.
  const thump = ctx.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(voice.body.freq, now);
  thump.frequency.exponentialRampToValueAtTime(
    voice.body.freq * voice.body.drop,
    now + voice.body.decay,
  );

  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(voice.body.gain, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + voice.body.decay);

  thump.connect(thumpGain).connect(muara);
  thump.start(now);
  thump.stop(now + voice.body.decay);

  // Lapis tiga: ekor gema ruang arena, naik sekejap lalu surut.
  const tail = ctx.createBufferSource();
  tail.buffer = noise;
  tail.playbackRate.value = 0.5 + Math.random() * 0.2;

  const tailFilter = ctx.createBiquadFilter();
  tailFilter.type = "lowpass";
  tailFilter.frequency.value = voice.tail.cutoff;

  const tailGain = ctx.createGain();
  tailGain.gain.setValueAtTime(0.0001, now);
  tailGain.gain.exponentialRampToValueAtTime(voice.tail.gain, now + 0.02);
  tailGain.gain.exponentialRampToValueAtTime(0.0001, now + voice.tail.decay);

  tail.connect(tailFilter).connect(tailGain).connect(muara);
  tail.start(now, Math.random());
  tail.stop(now + voice.tail.decay);

  // Lapis empat: mekanik sesudah tembakan — slide, pompa, atau bolt.
  const action = voice.action;
  if (!action) return;
  for (let i = 0; i < action.clicks; i++) {
    const at = now + action.delay + i * 0.13;
    const click = ctx.createBufferSource();
    click.buffer = noise;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = action.cutoff;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(action.gain, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);

    click.connect(filter).connect(gain).connect(muara);
    click.start(at, Math.random());
    click.stop(at + 0.045);
  }
}

/** Letupan senjata pemain sendiri: tanpa jarak dan tanpa arah. */
export function playShot(type: WeaponType) {
  playShotAt(type);
}

/** Nada pendek saat sebuah tembakan kena; lebih tinggi untuk tembakan kepala. */
export function playHit(isHeadshot: boolean) {
  const eng = busFor("kena");
  if (!eng) return;
  const { ctx, bus } = eng;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(isHeadshot ? 1320 : 880, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  osc.connect(gain).connect(bus);
  osc.start(now);
  osc.stop(now + 0.09);
}

/**
 * Rangkaian isi ulang: tiap langkah mekaniknya dibunyikan pada waktunya
 * sendiri, direntangkan sepanjang lama isi ulang senjata yang dipakai.
 *
 * Seluruh rangkaian dijadwalkan SEKALIGUS pada jam Web Audio, bukan lewat
 * setTimeout beruntun. Jam audio berjalan tepat dan tidak ikut tersendat saat
 * frame berat atau tab berpindah, jadi ketukan terakhir benar-benar jatuh
 * menjelang senjata siap — sementara rangkaian yang dijadwalkan lewat timer
 * halaman akan melar bersama frame yang terlambat.
 */
export function playReload(type: WeaponType = "rifle", seconds?: number) {
  const eng = busFor("isiUlang");
  if (!eng) return;
  const { ctx, bus, noise } = eng;
  const mulai = ctx.currentTime;

  for (const step of reloadSequence(type, seconds)) {
    const at = mulai + step.time;

    const click = ctx.createBufferSource();
    click.buffer = noise;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = step.cutoff;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(step.gain, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + step.decay);

    click.connect(filter).connect(gain).connect(bus);
    click.start(at, Math.random());
    click.stop(at + step.decay);

    // Bagian berbobotnya — magasin yang masuk, bolt yang didorong — punya
    // dentum rendah. Tanpa itu semua langkah terdengar seperti satu ketukan
    // yang sama yang diulang-ulang.
    if (step.thump === null) continue;
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(step.thump, at);
    thump.frequency.exponentialRampToValueAtTime(
      step.thump * 0.6,
      at + step.decay,
    );

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(step.gain * 0.8, at);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, at + step.decay);

    thump.connect(thumpGain).connect(bus);
    thump.start(at);
    thump.stop(at + step.decay);
  }
}

/**
 * Ketukan pelatuk yang ditarik tanpa peluru, dengan watak senjatanya.
 *
 * Dibatasi lajunya: menahan pelatuk senapan serbu pada magasin kosong
 * memanggil fungsi ini sepuluh kali per detik, dan tanpa pembatas hasilnya
 * adalah deretan ketukan yang terdengar seperti senjata yang benar-benar
 * menembak — persis kebalikan dari yang ingin dikabarkan.
 */
export function playEmpty(type: WeaponType = "pistol") {
  const eng = busFor("isiUlang");
  if (!eng) return;
  const { ctx, bus, noise } = eng;
  const now = ctx.currentTime;
  if (!emptyClickAllowed(lastEmptyAt, now)) return;
  lastEmptyAt = now;

  const voice = EMPTY_VOICE[type];

  const click = ctx.createBufferSource();
  click.buffer = noise;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = voice.cutoff;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(voice.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.decay);

  click.connect(filter).connect(gain).connect(bus);
  click.start(now, Math.random());
  click.stop(now + voice.decay);

  // Senjata berat menambahkan bunyi bagian bergeraknya yang jatuh ke tempat
  // kosong; itulah yang membedakannya dari klik tipis pistol.
  if (voice.thunk === null) return;
  const thunk = ctx.createOscillator();
  thunk.type = "sine";
  thunk.frequency.setValueAtTime(voice.thunk, now);
  thunk.frequency.exponentialRampToValueAtTime(
    voice.thunk * 0.7,
    now + voice.decay,
  );

  const thunkGain = ctx.createGain();
  thunkGain.gain.setValueAtTime(voice.gain * 0.7, now);
  thunkGain.gain.exponentialRampToValueAtTime(0.0001, now + voice.decay);

  thunk.connect(thunkGain).connect(bus);
  thunk.start(now);
  thunk.stop(now + voice.decay);
}

/**
 * Tanda eliminasi: dua nada naik yang pendek, ditutup dentum rendah. Naik
 * untuk lawan yang tumbang, turun untuk pemain sendiri: telinga menangkap
 * arah nadanya lebih cepat daripada mata membaca umpan kill.
 */
export function playElimination(isOwnDeath = false) {
  const eng = busFor("eliminasi");
  if (!eng) return;
  const { ctx, bus } = eng;
  const now = ctx.currentTime;

  const nada = isOwnDeath ? [660, 440] : [520, 780];
  nada.forEach((freq, i) => {
    const at = now + i * 0.11;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, at);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.14, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);

    osc.connect(gain).connect(bus);
    osc.start(at);
    osc.stop(at + 0.16);
  });

  const thud = ctx.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(120, now);
  thud.frequency.exponentialRampToValueAtTime(45, now + 0.35);
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.3, now);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  thud.connect(thudGain).connect(bus);
  thud.start(now);
  thud.stop(now + 0.35);
}

/**
 * Cuplikan suasana arena untuk tombol Dengar: desau angin yang mengembang
 * lalu surut dalam satu detik. Latar yang sesungguhnya berjalan terus selama
 * pertandingan; cuplikan ini cukup untuk menilai kerasnya.
 */
export function playAmbienceSample() {
  const eng = busFor("suasana");
  if (!eng) return;
  const { ctx, bus, noise } = eng;
  const now = ctx.currentTime;
  const durasi = 1.1;

  const wind = ctx.createBufferSource();
  wind.buffer = noise;
  wind.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(260, now);
  filter.frequency.linearRampToValueAtTime(720, now + durasi * 0.45);
  filter.frequency.linearRampToValueAtTime(220, now + durasi);
  filter.Q.value = 0.9;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + durasi * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durasi);

  wind.connect(filter).connect(gain).connect(bus);
  wind.start(now, Math.random());
  wind.stop(now + durasi);
}

/**
 * Dengung latar: dua osilator yang sedikit berselisih nada, disaring rendah
 * dan digoyang perlahan. Bukan lagu — arena tembak-tembakan tidak butuh
 * melodi yang harus diingat, ia butuh latar yang mengisi kesunyian tanpa
 * menutupi bunyi langkah.
 */
export function startMusic() {
  const eng = ensureEngine();
  if (!eng || eng.musicNodes) return;
  const { ctx, music } = eng;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 3;
  filter.connect(music);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 160;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  const oscs = [110, 110.6, 164.8].map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = 0.09;
    osc.connect(gain).connect(filter);
    osc.start();
    return osc;
  });

  eng.musicNodes = {
    stop: () => {
      lfo.stop();
      for (const osc of oscs) osc.stop();
    },
  };
}

export function stopMusic() {
  if (!engine?.musicNodes) return;
  engine.musicNodes.stop();
  engine.musicNodes = null;
}
