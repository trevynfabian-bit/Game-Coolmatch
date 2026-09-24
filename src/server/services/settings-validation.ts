import { BINDABLE_ACTIONS, DEFAULT_BINDINGS, RESERVED_KEYS, type KeyBindings } from "@/lib/game/keybindings";
import type { MoveAction } from "@/lib/game/controls";
import { FOV_RANGE, GRAPHICS_QUALITY_IDS, RESOLUTION_RANGE, SENSITIVITY_RANGE, type GraphicsQuality } from "@/lib/settings/rules";

/**
 * Validasi nilai pengaturan yang dikirim klien. Berbeda dengan `sanitize*` di
 * klien yang diam-diam menjepit nilai rusak dari localStorage, server
 * MENOLAK nilai di luar aturan dan menyebutkan setiap isian yang salah, supaya
 * yang tersimpan di database selalu sah dan klien tahu apa yang ditolak.
 */

export interface AudioValues {
  master: number;
  sfx: number;
  music: number;
  ui: number;
  muted: boolean;
}

export interface GraphicsValues {
  quality: GraphicsQuality;
  resolutionScale: number;
  fov: number;
  showFps: boolean;
}

export interface ControlValues {
  sensitivity: number;
  bindings: KeyBindings;
}

export interface SettingsValues {
  audio?: AudioValues;
  graphics?: GraphicsValues;
  controls?: ControlValues;
}

export interface FieldError {
  field: string;
  message: string;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };

type Raw = Record<string, unknown>;

function isObject(value: unknown): value is Raw {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Kelipatan langkah dengan toleransi pembulatan pecahan biner. */
function onStep(value: number, min: number, step: number): boolean {
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

class Collector {
  errors: FieldError[] = [];
  fail(field: string, message: string) {
    this.errors.push({ field, message });
  }
  number(raw: Raw, key: string, path: string, min: number, max: number, { integer = false, step }: { integer?: boolean; step?: number } = {}) {
    const value = raw[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      this.fail(`${path}.${key}`, `harus angka ${min}..${max}`);
      return min;
    }
    if (integer && !Number.isInteger(value)) this.fail(`${path}.${key}`, "harus bilangan bulat");
    if (step !== undefined && !onStep(value, min, step)) this.fail(`${path}.${key}`, `harus kelipatan ${step}`);
    return value;
  }
  boolean(raw: Raw, key: string, path: string) {
    const value = raw[key];
    if (typeof value !== "boolean") {
      this.fail(`${path}.${key}`, "harus true atau false");
      return false;
    }
    return value;
  }
}

function audio(raw: unknown, c: Collector): AudioValues | undefined {
  if (!isObject(raw)) return void c.fail("audio", "harus objek");
  return {
    master: c.number(raw, "master", "audio", 0, 1),
    sfx: c.number(raw, "sfx", "audio", 0, 1),
    music: c.number(raw, "music", "audio", 0, 1),
    ui: c.number(raw, "ui", "audio", 0, 1),
    muted: c.boolean(raw, "muted", "audio"),
  };
}

function graphics(raw: unknown, c: Collector): GraphicsValues | undefined {
  if (!isObject(raw)) return void c.fail("graphics", "harus objek");
  const quality = raw.quality;
  if (typeof quality !== "string" || !(GRAPHICS_QUALITY_IDS as readonly string[]).includes(quality)) {
    c.fail("graphics.quality", `harus salah satu dari: ${GRAPHICS_QUALITY_IDS.join(", ")}`);
  }
  return {
    quality: quality as GraphicsQuality,
    resolutionScale: c.number(raw, "resolutionScale", "graphics", RESOLUTION_RANGE.min, RESOLUTION_RANGE.max, { step: RESOLUTION_RANGE.step }),
    fov: c.number(raw, "fov", "graphics", FOV_RANGE.min, FOV_RANGE.max, { integer: true }),
    showFps: c.boolean(raw, "showFps", "graphics"),
  };
}

const ACTION_IDS = new Set<string>(BINDABLE_ACTIONS.map((action) => action.id));

function controls(raw: unknown, c: Collector): ControlValues | undefined {
  if (!isObject(raw)) return void c.fail("controls", "harus objek");
  const sensitivity = c.number(raw, "sensitivity", "controls", SENSITIVITY_RANGE.min, SENSITIVITY_RANGE.max);
  // Tata tombol boleh sebagian: aksi yang tidak dikirim memakai tombol bawaan.
  const bindings: KeyBindings = { ...DEFAULT_BINDINGS };
  if (raw.bindings !== undefined) {
    if (!isObject(raw.bindings)) {
      c.fail("controls.bindings", "harus objek { aksi: kode tombol }");
    } else {
      for (const [action, code] of Object.entries(raw.bindings)) {
        const field = `controls.bindings.${action}`;
        if (!ACTION_IDS.has(action)) c.fail(field, "aksi tidak dikenal");
        else if (typeof code !== "string" || !/^[A-Za-z0-9]{2,24}$/.test(code)) c.fail(field, "kode tombol tidak sah");
        else if (code in RESERVED_KEYS) c.fail(field, `tombol dipakai untuk ${RESERVED_KEYS[code]}`);
        else bindings[action as MoveAction] = code;
      }
      const seen = new Map<string, string>();
      for (const [action, code] of Object.entries(bindings)) {
        const other = seen.get(code);
        if (other) c.fail(`controls.bindings.${action}`, `tombol sama dengan aksi ${other}`);
        seen.set(code, action);
      }
    }
  }
  return { sensitivity: Math.round(sensitivity * 100) / 100, bindings };
}

/** Memeriksa satu bagian pengaturan (mis. hanya audio). */
export function validateSection<K extends keyof SettingsValues>(section: K, raw: unknown): ValidationResult<NonNullable<SettingsValues[K]>> {
  const c = new Collector();
  const value = (section === "audio" ? audio(raw, c) : section === "graphics" ? graphics(raw, c) : controls(raw, c)) as SettingsValues[K];
  return c.errors.length > 0 || value === undefined ? { ok: false, errors: c.errors } : { ok: true, value: value! };
}

/** Memeriksa payload pengaturan gabungan; bagian yang tidak dikirim dibiarkan. */
export function validateSettings(raw: unknown): ValidationResult<SettingsValues> {
  if (!isObject(raw)) return { ok: false, errors: [{ field: "", message: "harus objek JSON" }] };
  const c = new Collector();
  const value: SettingsValues = {};
  if (raw.audio !== undefined) value.audio = audio(raw.audio, c);
  if (raw.graphics !== undefined) value.graphics = graphics(raw.graphics, c);
  if (raw.controls !== undefined) value.controls = controls(raw.controls, c);
  if (!value.audio && !value.graphics && !value.controls && c.errors.length === 0) {
    c.fail("", 'kirim minimal salah satu dari "audio", "graphics", "controls"');
  }
  return c.errors.length > 0 ? { ok: false, errors: c.errors } : { ok: true, value };
}
