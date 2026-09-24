import type { Skin } from "@/types/economy";

/**
 * Pola SVG prosedural untuk sebuah skin. Dirender di dalam `<defs>`; bentuk
 * lain lalu memakainya lewat `fill="url(#id)"`.
 *
 * Semua acak di sini deterministik (dibibit dari id skin) supaya hasil
 * prerender dan hidrasi sama persis dan tiap skin selalu tampil sama.
 */

function seeded(seedText: string) {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
}

function FlagPattern({ id, skin }: { id: string; skin: Skin }) {
  const [a, b, c] = skin.colors;
  const code = skin.country?.code;
  return (
    <pattern id={id} width="1" height="1" patternContentUnits="objectBoundingBox">
      {code === "ID" ? (
        <>
          <rect width="1" height="0.5" fill={a} />
          <rect y="0.5" width="1" height="0.5" fill={b} />
        </>
      ) : code === "JP" ? (
        <>
          <rect width="1" height="1" fill={a} />
          <ellipse cx="0.5" cy="0.5" rx="0.12" ry="0.3" fill={b} />
        </>
      ) : code === "BR" ? (
        <>
          <rect width="1" height="1" fill={a} />
          <polygon points="0.5,0.08 0.92,0.5 0.5,0.92 0.08,0.5" fill={b} />
          <ellipse cx="0.5" cy="0.5" rx="0.14" ry="0.26" fill={c} />
        </>
      ) : code === "DE" ? (
        <>
          <rect width="1" height="0.34" fill={a} />
          <rect y="0.33" width="1" height="0.34" fill={b} />
          <rect y="0.66" width="1" height="0.34" fill={c} />
        </>
      ) : code === "FR" ? (
        <>
          <rect width="0.34" height="1" fill={a} />
          <rect x="0.33" width="0.34" height="1" fill={b} />
          <rect x="0.66" width="0.34" height="1" fill={c} />
        </>
      ) : code === "KR" ? (
        <>
          <rect width="1" height="1" fill={a} />
          <path d="M0.38 0.5 A0.12 0.3 0 0 1 0.62 0.5 Z" fill={b} />
          <path d="M0.38 0.5 A0.12 0.3 0 0 0 0.62 0.5 Z" fill={c} />
        </>
      ) : (
        <>
          {skin.colors.map((color, index) => (
            <rect
              key={index}
              y={index / skin.colors.length}
              width="1"
              height={1 / skin.colors.length + 0.01}
              fill={color}
            />
          ))}
        </>
      )}
    </pattern>
  );
}

export function SkinPaint({ id, skin }: { id: string; skin: Skin }) {
  const [base, second = base, third = second, fourth = third] = skin.colors;

  switch (skin.pattern) {
    case "polos":
      return (
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={second} />
          <stop offset="1" stopColor={base} />
        </linearGradient>
      );

    case "garis":
      return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="6" height="6" fill={base} />
          <rect width="1.2" height="6" fill={second} />
        </pattern>
      );

    case "loreng": {
      const random = seeded(skin.id);
      const blobs = Array.from({ length: 9 }, () => ({
        cx: random() * 28,
        cy: random() * 28,
        rx: 3 + random() * 5,
        ry: 2 + random() * 3,
        rotate: random() * 180,
        color: [second, third, fourth][Math.floor(random() * 3)],
      }));
      return (
        <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="28" height="28" fill={base} />
          {blobs.map((blob, index) => (
            <ellipse
              key={index}
              cx={blob.cx}
              cy={blob.cy}
              rx={blob.rx}
              ry={blob.ry}
              fill={blob.color}
              transform={`rotate(${blob.rotate.toFixed(1)} ${blob.cx.toFixed(2)} ${blob.cy.toFixed(2)})`}
            />
          ))}
        </pattern>
      );
    }

    case "digital": {
      const random = seeded(skin.id);
      const cells: { x: number; y: number; color: string }[] = [];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const roll = random();
          if (roll < 0.45) continue;
          cells.push({ x, y, color: roll < 0.65 ? second : roll < 0.85 ? third : fourth });
        }
      }
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={base} />
          {cells.map((cell, index) => (
            <rect key={index} x={cell.x * 2} y={cell.y * 2} width="2" height="2" fill={cell.color} />
          ))}
        </pattern>
      );
    }

    case "logam":
      return (
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={base} />
          <stop offset="0.35" stopColor={second} />
          <stop offset="0.5" stopColor={third} />
          <stop offset="0.65" stopColor={second} />
          <stop offset="1" stopColor={fourth} />
        </linearGradient>
      );

    case "bendera":
      return <FlagPattern id={id} skin={skin} />;
  }
}
