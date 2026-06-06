// Deterministic rarity for a flower, derived purely from its genome so the same
// flower always carries the same rarity — no randomness, no server needed.

import type { Genome } from "./genome";
import { petalStyle } from "./flower-engine";
import { hexToRgb } from "./flower-engine";
import { HUMEUR_LABEL } from "./humeur";
import {
  HAT_RARITY, GLASSES_RARITY, HAT_LABELS, GLASSES_LABELS, SHOES_LABELS,
} from "./cosmetics";

export type RarityTier =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Legendary";

export interface Rarity {
  tier: RarityTier;
  score: number; // 0–100
  color: string; // badge accent
  traits: { label: string; value: string }[];
}

const STYLE_NAMES = ["Classic", "Star", "Tulip", "Blade", "Ruffled"];
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
  { tier: "Legendary", min: 82, color: "#e0a400" },
  { tier: "Epic", min: 64, color: "#a64bff" },
  { tier: "Rare", min: 44, color: "#1f8fff" },
  { tier: "Uncommon", min: 24, color: "#16b572" },
  { tier: "Common", min: 0, color: "#7a8090" },
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
  const colorScore = (hueGap(genome.couleurA, genome.couleurB) / 180) * 16;

  // Accessories add rarity.
  const hat = genome.chapeau ?? "none";
  const glasses = genome.lunettes ?? "none";
  const cosmeticScore = (HAT_RARITY[hat] + GLASSES_RARITY[glasses]) * 0.5;

  const score = Math.min(
    100,
    Math.round(styleScore + petalScore + humeurScore + colorScore + cosmeticScore),
  );

  const tier = TIERS.find((t) => score >= t.min)!;

  const traits = [
    { label: "Shape", value: STYLE_NAMES[style] },
    { label: "Petals", value: String(genome.petales) },
    { label: "Mood", value: HUMEUR_LABEL[genome.humeur] },
    { label: "Contrast", value: `${Math.round(hueGap(genome.couleurA, genome.couleurB))}°` },
  ];
  if (hat !== "none") traits.push({ label: "Hat", value: HAT_LABELS[hat] });
  if (glasses !== "none") traits.push({ label: "Glasses", value: GLASSES_LABELS[glasses] });
  if (genome.chaussures && genome.chaussures !== "sneaker")
    traits.push({ label: "Shoes", value: SHOES_LABELS[genome.chaussures] });

  return { tier: tier.tier, score, color: tier.color, traits };
}
