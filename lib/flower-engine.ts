// The flower engine. Geometry is computed by PURE functions (testable without
// p5). A thin draw routine takes a p5 instance plus an animation state and
// strokes the precomputed geometry. Same genome + same seed => same flower.

import type { Genome } from "./genome";
import { PETALES_MAX } from "./genome";
import { HUMEUR_META } from "./humeur";
import { prngFromHex, seedFromHex } from "./prng";

export type RGB = [number, number, number];

export interface Pt {
  x: number;
  y: number;
}

export interface PetalVariation {
  /** length multiplier ~ 1 ± 0.08 */
  lengthFactor: number;
  /** width multiplier ~ 1 ± 0.08 */
  widthFactor: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure colour helpers (deterministic RGB lerp — no p5)
// ─────────────────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Looping gradient sample: ping-pongs A→B→A so the seam is invisible. */
export function gradientAt(a: RGB, b: RGB, t: number): RGB {
  const phase = ((t % 1) + 1) % 1;
  const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2; // triangle wave 0..1..0
  return lerpRgb(a, b, tri);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure geometry
// ─────────────────────────────────────────────────────────────────────────────

function cubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return (
    u * u * u * p0 +
    3 * u * u * t * p1 +
    3 * u * t * t * p2 +
    t * t * t * p3
  );
}

/**
 * Outline of a single petal pointing "up" (toward -y), as a closed loop of
 * points. Two cubic Béziers: out along the left edge to the tip, back along
 * the right edge to the centre. `length` and `width` are in pixels.
 */
export function petalOutline(
  length: number,
  width: number,
  segPerCurve = 20,
): Pt[] {
  const pts: Pt[] = [];

  // Left edge: centre (0,0) -> tip (0,-L)
  for (let i = 0; i < segPerCurve; i++) {
    const t = i / segPerCurve;
    pts.push({
      x: cubic(0, -width, -width, 0, t),
      y: cubic(0, -length * 0.33, -length * 0.66, -length, t),
    });
  }
  // Right edge: tip (0,-L) -> centre (0,0)
  for (let i = 0; i < segPerCurve; i++) {
    const t = i / segPerCurve;
    pts.push({
      x: cubic(0, width, width, 0, t),
      y: cubic(-length, -length * 0.66, -length * 0.33, 0, t),
    });
  }
  return pts;
}

/** Style 1 — Étoile: narrow, elongated, pointed petals. */
function petalEtoile(length: number, width: number, segs = 20): Pt[] {
  const pts: Pt[] = [];
  const w = width * 0.38;
  const l = length * 1.28;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    pts.push({ x: cubic(0, -w * 0.35, -w * 0.35, 0, t), y: cubic(0, -l * 0.3, -l * 0.72, -l, t) });
  }
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    pts.push({ x: cubic(0, w * 0.35, w * 0.35, 0, t), y: cubic(-l, -l * 0.72, -l * 0.3, 0, t) });
  }
  return pts;
}

/** Style 2 — Tulipe: wide base, cupped shape. */
function petalTulipe(length: number, width: number, segs = 20): Pt[] {
  const pts: Pt[] = [];
  const w = width * 1.5;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    pts.push({ x: cubic(0, -w * 1.25, -w * 0.55, 0, t), y: cubic(0, -length * 0.18, -length * 0.68, -length, t) });
  }
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    pts.push({ x: cubic(0, w * 0.55, w * 1.25, 0, t), y: cubic(-length, -length * 0.68, -length * 0.18, 0, t) });
  }
  return pts;
}

/** Style 3 — Lancéolé: very long and narrow, like a blade. */
function petalLanceole(length: number, width: number, segs = 20): Pt[] {
  const pts: Pt[] = [];
  const w = width * 0.22;
  const l = length * 1.5;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    pts.push({ x: cubic(0, -w, -w * 0.55, 0, t), y: cubic(0, -l * 0.38, -l * 0.78, -l, t) });
  }
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    pts.push({ x: cubic(0, w * 0.55, w, 0, t), y: cubic(-l, -l * 0.78, -l * 0.38, 0, t) });
  }
  return pts;
}

/** Style 4 — Ondulé: wavy ruffled edges. */
function petalOndule(length: number, width: number, segs = 40): Pt[] {
  const pts: Pt[] = [];
  const waves = 3;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const sine = Math.sin(t * Math.PI * waves) * 0.18;
    pts.push({
      x: -(width * (1 - t * 0.9) * (0.9 + sine)),
      y: -length * t,
    });
  }
  for (let i = segs; i >= 0; i--) {
    const t = i / segs;
    const sine = Math.sin(t * Math.PI * waves) * 0.18;
    pts.push({
      x: width * (1 - t * 0.9) * (0.9 + sine),
      y: -length * t,
    });
  }
  return pts;
}

/**
 * Pick petal style 0-4 deterministically from the seed hash.
 * 0=Classic  1=Étoile  2=Tulipe  3=Lancéolé  4=Ondulé
 */
export function petalStyle(seedHash: string): number {
  return seedFromHex(seedHash + "style") % 5;
}

export function petalOutlineStyled(
  length: number,
  width: number,
  style: number,
  segs = 20,
): Pt[] {
  switch (style) {
    case 1: return petalEtoile(length, width, segs);
    case 2: return petalTulipe(length, width, segs);
    case 3: return petalLanceole(length, width, segs);
    case 4: return petalOndule(length, width, segs);
    default: return petalOutline(length, width, segs);
  }
}

/**
 * Deterministic per-petal organic variation (±8%) derived from the seed hash.
 * Index-stable: petal i always gets the same variation for a given seed, so
 * growing more petals never reshuffles the existing ones.
 */
export function petalVariations(seedHash: string): PetalVariation[] {
  const rand = prngFromHex(seedHash);
  const out: PetalVariation[] = [];
  for (let i = 0; i < PETALES_MAX; i++) {
    out.push({
      lengthFactor: 1 + (rand() - 0.5) * 0.16, // ±8%
      widthFactor: 1 + (rand() - 0.5) * 0.16,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation state + draw
// ─────────────────────────────────────────────────────────────────────────────

export interface DrawState {
  /** Animated float petal count (germination lerps toward the target). */
  petalesAffiches: number;
  /** Currently displayed colours (lerped during a colour transition). */
  couleurA: RGB;
  couleurB: RGB;
  /** Gradient flow phase, advances with time (loops). */
  phase: number;
  /** Elapsed time in seconds (drives pulsation). */
  time: number;
}

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

// p5 is only typed loosely here so the engine has no hard p5 import (keeps the
// pure functions above trivially testable). The component passes a real p5.
type P5Like = {
  push: () => void;
  pop: () => void;
  translate: (x: number, y: number) => void;
  rotate: (a: number) => void;
  scale: (s: number) => void;
  stroke: (r: number, g: number, b: number, a?: number) => void;
  strokeWeight: (w: number) => void;
  noStroke: () => void;
  noFill: () => void;
  fill: (r: number, g: number, b: number, a?: number) => void;
  ellipse: (x: number, y: number, w: number, h: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  drawingContext: CanvasRenderingContext2D;
};

function strokeOutline(
  p: P5Like,
  pts: Pt[],
  a: RGB,
  b: RGB,
  phase: number,
  weight: number,
  alpha: number,
) {
  p.strokeWeight(weight);
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const nxt = pts[(i + 1) % n];
    const t = i / n;
    const c = gradientAt(a, b, t + phase);
    p.stroke(c[0], c[1], c[2], alpha);
    p.line(cur.x, cur.y, nxt.x, nxt.y);
  }
}

function drawPetal(
  p: P5Like,
  angle: number,
  petalScale: number,
  baseRadius: number,
  variation: PetalVariation,
  a: RGB,
  b: RGB,
  phase: number,
  style: number,
  coreOffset: number,
) {
  const length = baseRadius * variation.lengthFactor;
  const width = baseRadius * 0.46 * variation.widthFactor;
  const pts = petalOutlineStyled(length, width, style);

  p.push();
  p.rotate(angle);
  // Push the petal base out to the rim of the core so petals radiate from the
  // core's edge instead of piling up through the centre.
  p.translate(0, -coreOffset);
  p.scale(petalScale);
  p.noFill();
  // Neon halo: wide, faint.
  strokeOutline(p, pts, a, b, phase, 6, 30);
  // Crisp wire.
  strokeOutline(p, pts, a, b, phase, 1.75, 255);
  p.pop();
}

function drawCore(
  p: P5Like,
  baseRadius: number,
  a: RGB,
  b: RGB,
  phase: number,
  time: number,
) {
  const pulse = 1 + 0.1 * Math.sin(time * 3);
  const r = baseRadius * 0.15 * pulse;
  const segs = 36;
  const pts: Pt[] = [];
  for (let i = 0; i < segs; i++) {
    const ang = (i / segs) * TWO_PI;
    pts.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
  }
  const mid = gradientAt(a, b, phase);

  p.push();
  // Soft dark face-plate so the eyes/mouth read clearly inside the core.
  p.noStroke();
  p.fill(8, 4, 14, 200);
  p.ellipse(0, 0, r * 2.1, r * 2.1);
  // A faint coloured halo disc.
  p.fill(mid[0], mid[1], mid[2], 22);
  p.ellipse(0, 0, r * 1.7, r * 1.7);

  // Crisp ring around the core.
  p.noFill();
  // shadowBlur is reserved for the core only (too costly everywhere else).
  p.drawingContext.shadowBlur = 24;
  p.drawingContext.shadowColor = `rgb(${mid[0]},${mid[1]},${mid[2]})`;
  strokeOutline(p, pts, a, b, phase, 1.75, 255);
  p.drawingContext.shadowBlur = 0;
  p.pop();
}

/**
 * Draw the full flower. `size` is the min canvas dimension in pixels; the
 * caller is responsible for clearing the frame and centring is handled here.
 */
export function drawFlower(
  p: P5Like,
  genome: Genome,
  state: DrawState,
  size: number,
) {
  const variations = petalVariations(genome.seedHash);
  const baseRadius = size * 0.3;
  const meta = HUMEUR_META[genome.humeur];
  const pulse = 1 + 0.03 * Math.sin(state.time * meta.pulse * 2);
  const style = petalStyle(genome.seedHash);
  // Core radius (matches drawCore); petals start just inside its rim.
  const coreOffset = baseRadius * 0.15 * 0.92;

  const nFull = Math.floor(state.petalesAffiches);
  const frac = state.petalesAffiches - nFull;
  const growing = frac > 0.01;
  const slots = Math.max(1, nFull + (growing ? 1 : 0));

  p.push();
  p.scale(pulse);

  // Petals slowly orbit the core; speed is gently scaled by the mood. The core
  // (and the DOM face above it) stay still and centred.
  p.push();
  p.rotate(state.time * 0.16 * meta.pulse);

  for (let i = 0; i < nFull; i++) {
    const angle = -HALF_PI + (i / slots) * TWO_PI;
    drawPetal(
      p,
      angle,
      1,
      baseRadius,
      variations[i % PETALES_MAX],
      state.couleurA,
      state.couleurB,
      state.phase,
      style,
      coreOffset,
    );
  }
  if (growing) {
    const angle = -HALF_PI + (nFull / slots) * TWO_PI;
    drawPetal(
      p,
      angle,
      frac,
      baseRadius,
      variations[nFull % PETALES_MAX],
      state.couleurA,
      state.couleurB,
      state.phase,
      style,
      coreOffset,
    );
  }
  p.pop();

  drawCore(p, baseRadius, state.couleurA, state.couleurB, state.phase, state.time);
  p.pop();
}
