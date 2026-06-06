import { seedFromHex } from "./prng";
import { computeRarity } from "./rarity";
import type { Genome } from "./genome";

const SUPPLY = 9999;

/** Deterministic token id 1..9999 from the seed (accessories don't change it). */
export function tokenId(seedHash: string): number {
  return (seedFromHex(seedHash + "token") % SUPPLY) + 1;
}

export function tokenLabel(seedHash: string): string {
  return `#${String(tokenId(seedHash)).padStart(4, "0")}`;
}

/**
 * A believable global rank: rarer flowers rank closer to #1. Derived from the
 * rarity score with a tiny seed jitter so ties don't collide.
 */
export function rank(genome: Genome): number {
  const score = computeRarity(genome).score; // 0..100
  const jitter = (seedFromHex(genome.seedHash + "rank") % 60) - 30;
  const r = Math.round(((100 - score) / 100) * (SUPPLY - 1)) + 1 + jitter;
  return Math.max(1, Math.min(SUPPLY, r));
}

export function rankLabel(genome: Genome): string {
  return `Rank #${rank(genome)} / ${SUPPLY}`;
}
