"use client";

import { useMemo } from "react";
import type { Genome } from "@/lib/genome";
import { petalStyle } from "@/lib/flower-engine";
import { seedFromHex } from "@/lib/prng";

interface Props {
  genome: Genome;
  size?: number;
}

const STYLE_RXY: Record<number, [number, number]> = {
  0: [0.07, 0.16],
  1: [0.045, 0.2],
  2: [0.1, 0.14],
  3: [0.032, 0.22],
  4: [0.085, 0.17],
};

/**
 * Lightweight animated pastel flower (SVG): rounded glossy petals slowly
 * rotating around a kawaii core face. Matches the 3D look without a WebGL
 * context, so it's safe to render many at once in a grid.
 */
export default function FlowerPreview({ genome, size = 140 }: Props) {
  const { petales, couleurA, couleurB, seedHash } = genome;
  const cx = size / 2;
  const cy = size / 2;
  const coreR = size * 0.16;
  const style = petalStyle(seedHash);
  const [rxF, ryF] = STYLE_RXY[style] ?? STYLE_RXY[0];
  const rx = size * rxF;
  const ry = size * ryF;
  const gid = `fp-${seedHash.slice(2, 12)}`;

  // A slightly different spin duration per flower keeps the grid lively.
  const dur = useMemo(() => 11 + (seedFromHex(seedHash) % 9), [seedHash]);

  const petals = Array.from({ length: petales }, (_, i) => {
    const deg = (i / petales) * 360;
    const color = i % 2 === 0 ? couleurA : couleurB;
    const py = cy - coreR - ry * 0.7;
    return (
      <g key={i} transform={`rotate(${deg} ${cx} ${cy})`}>
        <ellipse cx={cx} cy={py} rx={rx} ry={ry} fill={color} opacity={0.92} />
        <ellipse cx={cx} cy={py - ry * 0.25} rx={rx * 0.5} ry={ry * 0.55} fill="#ffffff" opacity={0.3} />
      </g>
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={couleurA} stopOpacity="0.16" />
          <stop offset="100%" stopColor={couleurB} stopOpacity="0.02" />
        </radialGradient>
        <radialGradient id={`${gid}-core`} cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor={couleurA} stopOpacity="0.55" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={size * 0.46} fill={`url(#${gid})`} />

      <g
        className="fm-spin"
        style={{ animationDuration: `${dur}s` }}
      >
        {petals}
      </g>

      {/* Core + kawaii face */}
      <circle cx={cx} cy={cy} r={coreR} fill={`url(#${gid}-core)`} />
      {/* cheeks */}
      <ellipse cx={cx - coreR * 0.55} cy={cy + coreR * 0.2} rx={coreR * 0.22} ry={coreR * 0.14} fill="#ff9fc0" opacity={0.7} />
      <ellipse cx={cx + coreR * 0.55} cy={cy + coreR * 0.2} rx={coreR * 0.22} ry={coreR * 0.14} fill="#ff9fc0" opacity={0.7} />
      {/* eyes (closed, happy) */}
      <path d={`M ${cx - coreR * 0.5} ${cy - coreR * 0.05} q ${coreR * 0.18} ${coreR * 0.18} ${coreR * 0.36} 0`} stroke="#3a3346" strokeWidth={size * 0.012} fill="none" strokeLinecap="round" />
      <path d={`M ${cx + coreR * 0.14} ${cy - coreR * 0.05} q ${coreR * 0.18} ${coreR * 0.18} ${coreR * 0.36} 0`} stroke="#3a3346" strokeWidth={size * 0.012} fill="none" strokeLinecap="round" />
      {/* nose */}
      <circle cx={cx} cy={cy + coreR * 0.12} r={coreR * 0.07} fill="#ff7fa8" />
      {/* smile */}
      <path d={`M ${cx - coreR * 0.18} ${cy + coreR * 0.32} q ${coreR * 0.18} ${coreR * 0.2} ${coreR * 0.36} 0`} stroke="#3a3346" strokeWidth={size * 0.012} fill="none" strokeLinecap="round" />

      {/* glasses */}
      {(() => {
        const gl = genome.lunettes ?? "none";
        if (gl === "none") return null;
        const ey = cy - coreR * 0.04;
        const ex = coreR * 0.42;
        const lw = coreR * 0.34, lh = coreR * 0.26;
        if (gl === "heart") {
          return [-1, 1].map((sx) => (
            <circle key={sx} cx={cx + sx * ex} cy={ey} r={lh * 0.6} fill="none" stroke="#ff4f86" strokeWidth={size * 0.016} />
          ));
        }
        if (gl === "round") {
          return [-1, 1].map((sx) => (
            <circle key={sx} cx={cx + sx * ex} cy={ey} r={lh * 0.55} fill="none" stroke="#2a2433" strokeWidth={size * 0.012} />
          ));
        }
        const fill = gl === "star" ? "#ffce46" : "#1f1b29";
        return (
          <g>
            {[-1, 1].map((sx) => (
              <rect key={sx} x={cx + sx * ex - lw / 2} y={ey - lh / 2} width={lw} height={lh} rx={gl === "thug" ? 1 : lh * 0.4} fill={fill} />
            ))}
            <rect x={cx - ex * 0.5} y={ey - size * 0.008} width={ex} height={size * 0.016} fill={fill} />
          </g>
        );
      })()}

      {/* hat */}
      {(() => {
        const ht = genome.chapeau ?? "none";
        if (ht === "none") return null;
        const top = cy - coreR;
        if (ht === "party") {
          return (
            <g>
              <path d={`M ${cx} ${top - coreR * 0.75} L ${cx - coreR * 0.42} ${top + coreR * 0.12} L ${cx + coreR * 0.42} ${top + coreR * 0.12} Z`} fill="#e85fc8" />
              <circle cx={cx} cy={top - coreR * 0.75} r={coreR * 0.1} fill="#ffe57a" />
            </g>
          );
        }
        if (ht === "tophat") {
          return (
            <g>
              <rect x={cx - coreR * 0.36} y={top - coreR * 0.7} width={coreR * 0.72} height={coreR * 0.72} fill="#2c2836" />
              <rect x={cx - coreR * 0.62} y={top + coreR * 0.02} width={coreR * 1.24} height={coreR * 0.14} rx={coreR * 0.06} fill="#2c2836" />
            </g>
          );
        }
        if (ht === "crown") {
          return (
            <path d={`M ${cx - coreR * 0.55} ${top + coreR * 0.1} L ${cx - coreR * 0.55} ${top - coreR * 0.3} L ${cx - coreR * 0.27} ${top} L ${cx} ${top - coreR * 0.38} L ${cx + coreR * 0.27} ${top} L ${cx + coreR * 0.55} ${top - coreR * 0.3} L ${cx + coreR * 0.55} ${top + coreR * 0.1} Z`} fill="#f0c33c" stroke="#d9a92a" strokeWidth={size * 0.006} />
          );
        }
        if (ht === "beret") {
          return <ellipse cx={cx} cy={top + coreR * 0.02} rx={coreR * 0.62} ry={coreR * 0.26} fill="#3f4a8c" />;
        }
        // cap
        return (
          <g>
            <path d={`M ${cx - coreR * 0.62} ${top + coreR * 0.12} A ${coreR * 0.62} ${coreR * 0.62} 0 0 1 ${cx + coreR * 0.62} ${top + coreR * 0.12} Z`} fill="#e6465a" />
            <ellipse cx={cx + coreR * 0.45} cy={top + coreR * 0.16} rx={coreR * 0.45} ry={coreR * 0.1} fill="#cc3a4c" />
          </g>
        );
      })()}
    </svg>
  );
}
