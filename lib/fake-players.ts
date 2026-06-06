// 20 fake players, each with one generated flower listed in The Garden, so the
// market feels alive alongside flowers from real players. Deterministic: the
// same handle always yields the same flower + address.

import { genomeFromSeed, nomPoetique } from "./flower-random";
import { seedFromHex } from "./prng";
import type { FlowerListing } from "./collection";

const HANDLES = [
  "neuno", "petalpope", "bloomgrl", "mossy", "0xfern", "lumina",
  "violetvox", "sporeling", "dewdrop", "cosmosly", "honeyhz", "nyx",
  "terramint", "glowbean", "saffron", "tidalix", "emberlee", "fauna",
  "zephyrr", "marigold",
];

function fakeAddress(handle: string): string {
  let hex = "";
  let n = seedFromHex(handle + "addr");
  while (hex.length < 40) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    hex += n.toString(16).padStart(8, "0");
  }
  return `0x${hex.slice(0, 40)}`;
}

export const PLAYER_FLOWERS: FlowerListing[] = HANDLES.map((handle, i) => {
  const genome = genomeFromSeed(`${handle}-bloom-${i}`);
  const tierBump = seedFromHex(handle) % 5; // a little price spread
  const price = +(0.04 + tierBump * 0.06 + (i % 4) * 0.03).toFixed(2);
  return {
    id: `player-${i}`,
    name: nomPoetique(genome.seedHash),
    genome,
    price,
    seller: fakeAddress(handle),
    listed: true,
    txHash: null,
    owned: false,
    owner: handle,
  };
});
