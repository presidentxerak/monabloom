"use client";

import type { Genome } from "@/lib/genome";
import { petalStyle } from "@/lib/flower-engine";

interface Props {
  genome: Genome;
  size?: number;
}

/** Lightweight SVG thumbnail of a flower — no p5.js, safe for lists/grids. */
export default function FlowerPreview({ genome, size = 140 }: Props) {
  const { petales, couleurA, couleurB, seedHash } = genome;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.31;
  const coreR = size * 0.07; // petals start at the core rim
  const style = petalStyle(seedHash);
  const gradId = `fg-${seedHash.slice(2, 14)}`;

  const petalsEl = Array.from({ length: petales }, (_, i) => {
    const angle = (i / petales) * Math.PI * 2 - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Base sits on the core rim, not the dead centre.
    const bx = cx + cos * coreR;
    const by = cy + sin * coreR;

    // Tip of the petal
    const tx = cx + cos * R;
    const ty = cy + sin * R;

    // Style-specific control points
    let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
    const perp = { x: -sin, y: cos };

    switch (style) {
      case 1: // Étoile — narrow and pointed
        cp1x = cx + cos * R * 0.35 + perp.x * R * 0.12;
        cp1y = cy + sin * R * 0.35 + perp.y * R * 0.12;
        cp2x = cx + cos * R * 0.8 + perp.x * R * 0.08;
        cp2y = cy + sin * R * 0.8 + perp.y * R * 0.08;
        break;
      case 2: // Tulipe — wide base
        cp1x = cx + cos * R * 0.2 + perp.x * R * 0.55;
        cp1y = cy + sin * R * 0.2 + perp.y * R * 0.55;
        cp2x = cx + cos * R * 0.75 + perp.x * R * 0.45;
        cp2y = cy + sin * R * 0.75 + perp.y * R * 0.45;
        break;
      case 3: // Lancéolé — very narrow
        cp1x = cx + cos * R * 0.4 + perp.x * R * 0.07;
        cp1y = cy + sin * R * 0.4 + perp.y * R * 0.07;
        cp2x = cx + cos * R * 0.85 + perp.x * R * 0.05;
        cp2y = cy + sin * R * 0.85 + perp.y * R * 0.05;
        break;
      case 4: // Ondulé — wavy
        cp1x = cx + cos * R * 0.3 + perp.x * R * 0.5;
        cp1y = cy + sin * R * 0.3 + perp.y * R * 0.5;
        cp2x = cx + cos * R * 0.7 + perp.x * R * 0.25;
        cp2y = cy + sin * R * 0.7 + perp.y * R * 0.25;
        break;
      default: // Classic
        cp1x = cx + cos * R * 0.33 + perp.x * R * 0.42;
        cp1y = cy + sin * R * 0.33 + perp.y * R * 0.42;
        cp2x = cx + cos * R * 0.7 + perp.x * R * 0.42;
        cp2y = cy + sin * R * 0.7 + perp.y * R * 0.42;
    }

    // Mirror control points for the return path; start/end on the core rim.
    const d = `M ${bx} ${by} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${tx} ${ty} C ${2 * tx - cp2x} ${2 * ty - cp2y} ${2 * tx - cp1x} ${2 * ty - cp1y} ${bx} ${by}`;
    const color = i % 2 === 0 ? couleurA : couleurB;

    return (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        opacity={0.88}
      />
    );
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={couleurA} stopOpacity="0.18" />
          <stop offset="100%" stopColor={couleurB} stopOpacity="0.04" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R * 1.1} fill={`url(#${gradId})`} />
      {petalsEl}
      <circle cx={cx} cy={cy} r={size * 0.055} fill="none" stroke={couleurA} strokeWidth={1.3} />
      <circle cx={cx} cy={cy} r={size * 0.025} fill={couleurA} opacity={0.7} />
    </svg>
  );
}
