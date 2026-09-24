import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { Skin } from "@/types/economy";

/**
 * Tekstur kanvas untuk skin, dipakai model 3D (inspect dan viewmodel).
 *
 * Polanya digambar ulang dengan Canvas 2D dari data skin yang sama dengan pola
 * SVG di halaman, jadi yang tampil di galeri dan saat inspect adalah cat yang
 * sama. Hasilnya di-cache per skin karena menggambar kanvas cukup mahal.
 */

const SIZE = 256;
const cache = new Map<string, CanvasTexture>();

function seeded(seedText: string) {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
}

function drawFlag(ctx: CanvasRenderingContext2D, skin: Skin) {
  const [a, b, c] = skin.colors;
  const code = skin.country?.code;
  const S = SIZE;
  const rect = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * S, y * S, w * S, h * S);
  };
  if (code === "ID") {
    rect(a, 0, 0, 1, 0.5);
    rect(b, 0, 0.5, 1, 0.5);
  } else if (code === "JP" || code === "KR") {
    rect(a, 0, 0, 1, 1);
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = b;
    ctx.fill();
    if (code === "KR") {
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S * 0.2, 0, Math.PI);
      ctx.fillStyle = c;
      ctx.fill();
    }
  } else if (code === "BR") {
    rect(a, 0, 0, 1, 1);
    ctx.beginPath();
    ctx.moveTo(S / 2, S * 0.1);
    ctx.lineTo(S * 0.9, S / 2);
    ctx.lineTo(S / 2, S * 0.9);
    ctx.lineTo(S * 0.1, S / 2);
    ctx.closePath();
    ctx.fillStyle = b;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  } else if (code === "DE") {
    rect(a, 0, 0, 1, 0.34);
    rect(b, 0, 0.33, 1, 0.34);
    rect(c, 0, 0.66, 1, 0.34);
  } else if (code === "FR" || code === "IT") {
    rect(a, 0, 0, 0.34, 1);
    rect(b, 0.33, 0, 0.34, 1);
    rect(c, 0.66, 0, 0.34, 1);
  } else if (code === "TH") {
    rect(a, 0, 0, 1, 1);
    rect(b, 0, 0.17, 1, 0.66);
    rect(c, 0, 0.33, 1, 0.34);
  } else {
    skin.colors.forEach((color, index) => rect(color, 0, index / skin.colors.length, 1, 1 / skin.colors.length + 0.01));
  }
}

function drawSkin(ctx: CanvasRenderingContext2D, skin: Skin) {
  const [base, second = base, third = second, fourth = third] = skin.colors;
  const S = SIZE;

  switch (skin.pattern) {
    case "polos": {
      const gradient = ctx.createLinearGradient(0, 0, 0, S);
      gradient.addColorStop(0, second);
      gradient.addColorStop(1, base);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, S, S);
      return;
    }
    case "garis": {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = second;
      ctx.lineWidth = 6;
      for (let i = -S; i < S * 2; i += 26) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + S * 0.7, S);
        ctx.stroke();
      }
      return;
    }
    case "loreng": {
      const random = seeded(skin.id);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 38; i++) {
        ctx.fillStyle = [second, third, fourth][Math.floor(random() * 3)];
        ctx.beginPath();
        ctx.ellipse(random() * S, random() * S, 12 + random() * 26, 8 + random() * 14, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    case "digital": {
      const random = seeded(skin.id);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, S, S);
      const cell = 8;
      for (let y = 0; y < S; y += cell) {
        for (let x = 0; x < S; x += cell) {
          const roll = random();
          if (roll < 0.45) continue;
          ctx.fillStyle = roll < 0.65 ? second : roll < 0.85 ? third : fourth;
          ctx.fillRect(x, y, cell, cell);
        }
      }
      return;
    }
    case "logam": {
      const gradient = ctx.createLinearGradient(0, 0, S, S);
      gradient.addColorStop(0, base);
      gradient.addColorStop(0.35, second);
      gradient.addColorStop(0.5, third);
      gradient.addColorStop(0.65, second);
      gradient.addColorStop(1, fourth);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, S, S);
      return;
    }
    case "bendera":
      drawFlag(ctx, skin);
  }
}

/** Tekstur untuk skin; null di server atau bila kanvas tidak tersedia. */
export function skinTexture(skin: Skin): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const hit = cache.get(skin.id);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawSkin(ctx, skin);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  cache.set(skin.id, texture);
  return texture;
}

/** Kilap material menurut pola: emas memantul, camo doff. */
export function skinFinish(skin: Skin | null | undefined): { roughness: number; metalness: number } {
  if (!skin) return { roughness: 0.45, metalness: 0.5 };
  if (skin.pattern === "logam") return { roughness: 0.18, metalness: 0.95 };
  if (skin.pattern === "polos" || skin.pattern === "garis") return { roughness: 0.5, metalness: 0.35 };
  return { roughness: 0.7, metalness: 0.15 };
}
