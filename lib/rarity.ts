// Deterministic rarity for a flower, derived purely from its genome so the same
// flower always carries the same rarity — no randomness, no server needed.

import type { Genome } from "./genome";
import { petalStyle } from "./flower-engine";
import { hexToRgb } from "./flower-engine";

export type RarityTier =
  | "Commune"
  | "Peu commune"
  | "Rare"
  | "Épique"
  | "Légendaire";

export interface Rarity {
  tier: RarityTier;
  score: number; // 0–100
  color: string; // badge accent
  traits: { label: string; value: string }[];
}

const STYLE_NAMES = ["Classique", "Étoile", "Tulipe", "Lancéolé", "Ondulé"];
// Lower frequency => rarer. Ondulé/Lancéolé are the showy ones.
const STYLE_WEIGHTS = [10, 25, 22, 30, 35];

const HUMEUR_WEIGHTS: Record<string, number> = {
  sereine: 8,
  joyeuse: 12,
  reveuse: 18,
  espiegle: 24,
  melancolique: 30,
};

const TIERS: { tier: RarityTier; min: number; color: string }[] = [
  { tier: "Légendaire", min: 82, color: "#ffd34d" },
  { tier: "Épique", min: 64, color: "#c46bff" },
  { tier: "Rare", min: 44, color: "#4db8ff" },
  { tier: "Peu commune", min: 24, color: "#4dffa6" },
  { tier: "Commune", min: 0, color: "#9aa0ad" },
];

/** Hue (0–360) of an #rrggbb colour. */
function hue(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** Shortest distance between two hues on the colour wheel (0–180). */
function hueGap(a: string, b: string): number {
  const diff = Math.abs(hue(a) - hue(b));
  return diff > 180 ? 360 - diff : diff;
}

export function computeRarity(genome: Genome): Rarity {
  const style = petalStyle(genome.seedHash);
  const styleScore = STYLE_WEIGHTS[style] ?? 10;

  // Petal extremes (3 or 12) are rarer than the middle (7–8).
  const petalScore = (Math.abs(genome.petales - 7.5) / 4.5) * 25;

  const humeurScore = HUMEUR_WEIGHTS[genome.humeur] ?? 10;

  // Complementary colours (gap near 180°) read as more striking → rarer.
  const colorScore = (hueGap(genome.couleurA, genome.couleurB) / 180) * 20;

  const score = Math.min(
    100,
    Math.round(styleScore + petalScore + humeurScore + colorScore),
  );

  const tier = TIERS.find((t) => score >= t.min)!;

  return {
    tier: tier.tier,
    score,
    color: tier.color,
    traits: [
      { label: "Forme", value: STYLE_NAMES[style] },
      { label: "Pétales", value: String(genome.petales) },
      { label: "Humeur", value: genome.humeur },
      { label: "Contraste", value: `${Math.round(hueGap(genome.couleurA, genome.couleurB))}°` },
    ],
  };
}
