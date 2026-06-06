// 70 fake players, each with one generated flower listed in The Garden, so the
// market feels alive alongside flowers from real players. Deterministic.

import { genomeFromSeed, nomPoetique } from "./flower-random";
import { seedFromHex } from "./prng";
import { HATS, GLASSES, SHOES } from "./genome";
import type { FlowerListing } from "./collection";

const PREFIX = [
  "neon", "petal", "bloom", "moss", "fern", "luma", "violet", "spore", "dew",
  "cosmo", "honey", "nyx", "terra", "glow", "saffron", "tidal", "ember", "fauna",
  "zephyr", "mari", "aero", "brio", "clover", "dahlia", "echo", "flora", "gaia",
  "halo", "iris", "jade", "koi", "lotus", "mauve", "nova", "onyx", "poppy",
  "quill", "rune", "sage", "thorn", "umbra", "vesper", "willow", "xen", "yara",
  "zinnia", "aster", "bramble", "cinder", "drift",
];
const SUFFIX = [
  "bloom", "grl", "mon", "ly", "xo", "ish", "wave", "dust", "light", "core",
  "pop", "bee", "fox", "muse", "leaf", "star", "mint", "glow", "byte", "puff",
  "vibe", "song", "wisp", "lux", "nyx", "fizz", "drift", "spark", "haze", "reef",
];

const COUNT = 70;

function fakeAddress(handle: string): string {
  let hex = "";
  let n = seedFromHex(handle + "addr");
  while (hex.length < 40) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    hex += n.toString(16).padStart(8, "0");
  }
  return `0x${hex.slice(0, 40)}`;
}

const seen = new Set<string>();

export const PLAYER_FLOWERS: FlowerListing[] = Array.from({ length: COUNT }, (_, i) => {
  let handle = PREFIX[i % PREFIX.length] + SUFFIX[(i * 13) % SUFFIX.length];
  if (seen.has(handle)) handle += i;
  seen.add(handle);

  const genome = genomeFromSeed(`${handle}-bloom-${i}`);
  // Deterministic outfits give the market real variety (some plain, some decked).
  genome.chapeau = HATS[seedFromHex(handle + "hat") % HATS.length];
  genome.lunettes = GLASSES[seedFromHex(handle + "glasses") % GLASSES.length];
  genome.chaussures = SHOES[seedFromHex(handle + "shoes") % SHOES.length];

  const price = +(0.03 + (seedFromHex(handle) % 40) * 0.012).toFixed(2);
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
