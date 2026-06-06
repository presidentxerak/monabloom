// Player actions on a flower: feeding (water / fertilizer / power / sun) and
// cross-pollination (breeding two flowers). All pure + deterministic-friendly.

import { clampPetales, type Genome, type Humeur } from "./genome";
import { hexToRgb } from "./flower-engine";
import { seedFromHex, mulberry32 } from "./prng";

// ── Colour helpers (HSL) ─────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function adjust(
  hex: string,
  dS: number,
  dL: number,
  dH = 0,
): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return hslToHex((h + dH + 360) % 360, s + dS, l + dL);
}

// ── Feed actions ─────────────────────────────────────────────────────────────

export type FeedAction = "eau" | "engrais" | "pouvoir" | "soleil";

export interface FeedMeta {
  id: FeedAction;
  emoji: string;
  label: string;
  reply: string;
}

export const FEED_ACTIONS: FeedMeta[] = [
  { id: "eau", emoji: "💧", label: "Water", reply: "She drinks… and unfurls a new petal." },
  { id: "engrais", emoji: "🌱", label: "Fertilizer", reply: "Her colours swell with sap." },
  { id: "soleil", emoji: "☀️", label: "Sun", reply: "The light warms her hues." },
  { id: "pouvoir", emoji: "✨", label: "Power", reply: "A playful energy runs through her." },
];

/** Apply a feed action, returning a new genome. */
export function feedFlower(g: Genome, action: FeedAction): Genome {
  switch (action) {
    case "eau":
      // Water → growth.
      return { ...g, petales: clampPetales(g.petales + 1), humeur: "reveuse" };
    case "engrais":
      // Fertilizer → richer, more saturated colours.
      return {
        ...g,
        couleurA: adjust(g.couleurA, 0.16, 0.03),
        couleurB: adjust(g.couleurB, 0.16, 0.03),
      };
    case "soleil":
      // Sun → warmer hue + brighter.
      return {
        ...g,
        couleurA: adjust(g.couleurA, 0.05, 0.06, -12),
        humeur: "joyeuse",
      };
    case "pouvoir":
      // Power → playful mood + an extra petal + vivid bump.
      return {
        ...g,
        petales: clampPetales(g.petales + 1),
        couleurA: adjust(g.couleurA, 0.12, 0.0),
        humeur: "espiegle",
      };
  }
}

// ── Cross-pollination (breeding) ─────────────────────────────────────────────

const HUMEURS_ALL: Humeur[] = [
  "joyeuse",
  "reveuse",
  "melancolique",
  "espiegle",
  "sereine",
];

/** Blend two hex colours at t (0 = a, 1 = b). */
function mixHex(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  const to = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${to(ra[0] + (rb[0] - ra[0]) * t)}${to(ra[1] + (rb[1] - ra[1]) * t)}${to(ra[2] + (rb[2] - ra[2]) * t)}`;
}

/**
 * Cross two flowers into a child genome. Deterministic for a given pair: the
 * child seed interleaves both parents' seed hashes, and traits are inherited
 * (with a little blending) under that seed — so the same parents always give
 * the same child, but every pair is different.
 */
export function croiser(a: Genome, b: Genome): Genome {
  const combined = a.seedHash + "x" + b.seedHash;
  const rand = mulberry32(seedFromHex(combined));

  // Child seed hash: interleave parent hex, pick per-position.
  const ha = a.seedHash.slice(2);
  const hb = b.seedHash.slice(2);
  const len = Math.max(ha.length, hb.length, 16);
  let h = "";
  for (let i = 0; i < len; i++) {
    h += rand() < 0.5 ? ha[i] ?? "0" : hb[i] ?? "0";
  }
  const seedHash = `0x${h}`;

  // Petals: average ± a small inherited wobble.
  const petales = clampPetales(
    Math.round((a.petales + b.petales) / 2 + (rand() < 0.5 ? -1 : 1)),
  );

  // Colours: each child colour leans toward one parent, lightly blended.
  const couleurA =
    rand() < 0.5
      ? mixHex(a.couleurA, b.couleurA, 0.25)
      : mixHex(b.couleurA, a.couleurA, 0.25);
  const couleurB =
    rand() < 0.5
      ? mixHex(a.couleurB, b.couleurB, 0.25)
      : mixHex(b.couleurB, a.couleurB, 0.25);

  // Mood: inherited from a parent, with a rare mutation.
  let humeur: Humeur = rand() < 0.5 ? a.humeur : b.humeur;
  if (rand() < 0.1) humeur = HUMEURS_ALL[Math.floor(rand() * HUMEURS_ALL.length)];

  return {
    petales,
    couleurA,
    couleurB,
    humeur,
    bloc: Math.max(a.bloc, b.bloc),
    seedHash,
  };
}
