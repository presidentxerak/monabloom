"use client";

import { useMemo } from "react";
import type { Genome } from "@/lib/genome";
import { seedFromHex } from "@/lib/prng";

interface Props {
  genome: Genome;
  size?: number;
}

/**
 * A mini 2D version of the 3D Flowermon: flower head with petals (same shape
 * index as the 3D model), kawaii face, accessories, and a little bead body —
 * so the Garden thumbnails read as the same character. Petals rotate (CSS).
 */
export default function FlowerPreview({ genome, size = 140 }: Props) {
  const { couleurA, couleurB, seedHash, petales } = genome;
  const cx = size / 2;
  const cy = size * 0.37;
  const coreR = size * 0.15;
  const shape = genome.forme != null ? genome.forme : seedFromHex(seedHash + "3dshape") % 7;
  const gid = `fp-${seedHash.slice(2, 12)}`;
  const dur = useMemo(() => 12 + (seedFromHex(seedHash) % 8), [seedHash]);

  const petL = size * 0.12;
  const petW = size * 0.045;

  function petal(i: number) {
    const deg = (i / petales) * 360;
    const color = i % 2 === 0 ? couleurA : couleurB;
    const py = cy - coreR - petL * 0.55;
    let body: React.ReactNode;
    switch (shape) {
      case 1: // round blob
        body = <ellipse cx={cx} cy={py} rx={petL * 0.6} ry={petL * 0.7} fill={color} />;
        break;
      case 2: // diamond
        body = <polygon points={`${cx},${py - petL} ${cx + petW * 1.3},${py} ${cx},${py + petL} ${cx - petW * 1.3},${py}`} fill={color} />;
        break;
      case 3: // capsule
        body = <rect x={cx - petW} y={py - petL} width={petW * 2} height={petL * 2} rx={petW} fill={color} />;
        break;
      case 4: // pointed teardrop
        body = <path d={`M ${cx} ${py - petL * 1.2} C ${cx + petW * 1.6} ${py - petL * 0.2}, ${cx + petW * 1.2} ${py + petL}, ${cx} ${py + petL} C ${cx - petW * 1.2} ${py + petL}, ${cx - petW * 1.6} ${py - petL * 0.2}, ${cx} ${py - petL * 1.2} Z`} fill={color} />;
        break;
      case 5: // ring
        body = <circle cx={cx} cy={py} r={petL * 0.62} fill="none" stroke={color} strokeWidth={petW * 1.1} />;
        break;
      case 6: // beads
        body = <>{[-1, 0, 1].map((k) => <circle key={k} cx={cx} cy={py + k * petL * 0.7} r={petW * 1.2} fill={color} />)}</>;
        break;
      default: // oval
        body = <ellipse cx={cx} cy={py} rx={petW} ry={petL} fill={color} />;
    }
    return (
      <g key={i} transform={`rotate(${deg} ${cx} ${cy})`} opacity={0.95}>
        {body}
        {shape !== 5 && <ellipse cx={cx} cy={py - petL * 0.3} rx={petW * 0.5} ry={petL * 0.4} fill="#ffffff" opacity={0.28} />}
      </g>
    );
  }

  const hat = genome.chapeau ?? "none";
  const glasses = genome.lunettes ?? "none";
  const top = cy - coreR;

  // Body palette.
  const bodyY = cy + coreR;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <radialGradient id={gid} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={couleurA} stopOpacity="0.16" />
          <stop offset="100%" stopColor={couleurB} stopOpacity="0.02" />
        </radialGradient>
        <radialGradient id={`${gid}-core`} cx="42%" cy="36%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor={couleurA} stopOpacity="0.5" />
        </radialGradient>
      </defs>

      <rect width={size} height={size} fill={`url(#${gid})`} />

      {/* Body (static) */}
      <g>
        {/* legs + shoes */}
        {[-1, 1].map((sx) => (
          <g key={sx}>
            <circle cx={cx + sx * size * 0.05} cy={bodyY + size * 0.27} r={size * 0.035} fill={couleurA} />
            <ellipse cx={cx + sx * size * 0.05} cy={bodyY + size * 0.32} rx={size * 0.05} ry={size * 0.028} fill={couleurB} />
          </g>
        ))}
        {/* arms */}
        {[-1, 1].map((sx) => (
          <circle key={`a${sx}`} cx={cx + sx * size * 0.13} cy={bodyY + size * 0.1} r={size * 0.032} fill={couleurB} />
        ))}
        {/* torso */}
        <ellipse cx={cx} cy={bodyY + size * 0.12} rx={size * 0.1} ry={size * 0.15} fill={couleurA} />
        <ellipse cx={cx} cy={bodyY + size * 0.12} rx={size * 0.05} ry={size * 0.13} fill={couleurB} opacity={0.5} />
        {/* neck */}
        <circle cx={cx} cy={bodyY - size * 0.005} r={size * 0.03} fill={couleurB} />
      </g>

      {/* Petals (rotating) */}
      <g className="fm-spin" style={{ animationDuration: `${dur}s` }}>
        {Array.from({ length: petales }, (_, i) => petal(i))}
      </g>

      {/* Head */}
      <circle cx={cx} cy={cy} r={coreR} fill={`url(#${gid}-core)`} />
      <ellipse cx={cx - coreR * 0.55} cy={cy + coreR * 0.2} rx={coreR * 0.22} ry={coreR * 0.14} fill="#ff9fc0" opacity={0.7} />
      <ellipse cx={cx + coreR * 0.55} cy={cy + coreR * 0.2} rx={coreR * 0.22} ry={coreR * 0.14} fill="#ff9fc0" opacity={0.7} />
      <path d={`M ${cx - coreR * 0.5} ${cy - coreR * 0.05} q ${coreR * 0.18} ${coreR * 0.18} ${coreR * 0.36} 0`} stroke="#3a3346" strokeWidth={size * 0.012} fill="none" strokeLinecap="round" />
      <path d={`M ${cx + coreR * 0.14} ${cy - coreR * 0.05} q ${coreR * 0.18} ${coreR * 0.18} ${coreR * 0.36} 0`} stroke="#3a3346" strokeWidth={size * 0.012} fill="none" strokeLinecap="round" />
      <circle cx={cx} cy={cy + coreR * 0.12} r={coreR * 0.07} fill="#ff7fa8" />
      <path d={`M ${cx - coreR * 0.18} ${cy + coreR * 0.32} q ${coreR * 0.18} ${coreR * 0.2} ${coreR * 0.36} 0`} stroke="#3a3346" strokeWidth={size * 0.012} fill="none" strokeLinecap="round" />

      {/* Glasses */}
      {glasses !== "none" && (() => {
        const ey = cy - coreR * 0.04, ex = coreR * 0.42, lw = coreR * 0.34, lh = coreR * 0.26;
        if (glasses === "heart" || glasses === "round") {
          const stroke = glasses === "heart" ? "#ff4f86" : "#2a2433";
          return [-1, 1].map((sx) => <circle key={sx} cx={cx + sx * ex} cy={ey} r={lh * 0.58} fill="none" stroke={stroke} strokeWidth={size * 0.013} />);
        }
        const fill = glasses === "star" ? "#ffce46" : "#1f1b29";
        return (
          <g>
            {[-1, 1].map((sx) => <rect key={sx} x={cx + sx * ex - lw / 2} y={ey - lh / 2} width={lw} height={lh} rx={glasses === "thug" ? 1 : lh * 0.4} fill={fill} />)}
            <rect x={cx - ex * 0.5} y={ey - size * 0.008} width={ex} height={size * 0.016} fill={fill} />
          </g>
        );
      })()}

      {/* Hat */}
      {hat !== "none" && (() => {
        if (hat === "party") return <g><path d={`M ${cx} ${top - coreR * 0.75} L ${cx - coreR * 0.42} ${top + coreR * 0.12} L ${cx + coreR * 0.42} ${top + coreR * 0.12} Z`} fill="#e85fc8" /><circle cx={cx} cy={top - coreR * 0.75} r={coreR * 0.1} fill="#ffe57a" /></g>;
        if (hat === "tophat") return <g><rect x={cx - coreR * 0.36} y={top - coreR * 0.7} width={coreR * 0.72} height={coreR * 0.72} fill="#2c2836" /><rect x={cx - coreR * 0.62} y={top + coreR * 0.02} width={coreR * 1.24} height={coreR * 0.14} rx={coreR * 0.06} fill="#2c2836" /></g>;
        if (hat === "crown") return <path d={`M ${cx - coreR * 0.55} ${top + coreR * 0.1} L ${cx - coreR * 0.55} ${top - coreR * 0.3} L ${cx - coreR * 0.27} ${top} L ${cx} ${top - coreR * 0.38} L ${cx + coreR * 0.27} ${top} L ${cx + coreR * 0.55} ${top - coreR * 0.3} L ${cx + coreR * 0.55} ${top + coreR * 0.1} Z`} fill="#f0c33c" stroke="#d9a92a" strokeWidth={size * 0.006} />;
        if (hat === "beret") return <ellipse cx={cx} cy={top + coreR * 0.02} rx={coreR * 0.62} ry={coreR * 0.26} fill="#3f4a8c" />;
        return <g><path d={`M ${cx - coreR * 0.62} ${top + coreR * 0.12} A ${coreR * 0.62} ${coreR * 0.62} 0 0 1 ${cx + coreR * 0.62} ${top + coreR * 0.12} Z`} fill="#e6465a" /><ellipse cx={cx + coreR * 0.45} cy={top + coreR * 0.16} rx={coreR * 0.45} ry={coreR * 0.1} fill="#cc3a4c" /></g>;
      })()}
    </svg>
  );
}
