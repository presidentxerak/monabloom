// Deterministic PRNG. The whole point of Monabloom: same seed => same flower,
// pixel for pixel, in ten years. No Math.random() ever touches the render path.

/**
 * Derive a 32-bit unsigned integer seed from an arbitrary hex string
 * (e.g. a Monad block hash "0x...."). Folds the full string into the seed
 * so distinct hashes give distinct flowers.
 */
export function seedFromHex(hex: string): number {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  // FNV-1a style fold over the hex characters.
  let h = 0x811c9dc5;
  for (let i = 0; i < clean.length; i++) {
    h ^= clean.charCodeAt(i);
    // h *= 16777619, kept in 32-bit space.
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * mulberry32 — a tiny, fast, well-distributed seeded PRNG.
 * Returns a function producing floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: a seeded PRNG directly from a hex hash. */
export function prngFromHex(hex: string): () => number {
  return mulberry32(seedFromHex(hex));
}
