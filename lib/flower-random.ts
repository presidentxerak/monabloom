import { type Genome, type Humeur, HUMEURS } from "./genome";
import { seedFromHex, mulberry32 } from "./prng";

const COLOR_PALETTES: [string, string][] = [
  ["#ff6ec7", "#7a5cff"],
  ["#00ff88", "#0077ff"],
  ["#ffdd00", "#ff4400"],
  ["#ff8800", "#cc00ff"],
  ["#00ffee", "#ff0055"],
  ["#aaffcc", "#5500cc"],
  ["#ff3399", "#33ccff"],
  ["#ffcc00", "#00ff66"],
  ["#ff0066", "#6600ff"],
  ["#00ddff", "#ff6600"],
  ["#88ff00", "#ff0088"],
  ["#ff4400", "#0044ff"],
  ["#ff99cc", "#9900ff"],
  ["#00ff99", "#ff00aa"],
  ["#ffee00", "#0088ff"],
  ["#ff44bb", "#44ffcc"],
  ["#ccff00", "#ff5500"],
  ["#00ccff", "#ff00cc"],
  ["#ff6600", "#9900cc"],
  ["#44ff88", "#ff2266"],
];

/** Deterministic genome from an arbitrary seed string. */
export function genomeFromSeed(seedStr: string): Genome {
  const encoded = Array.from(seedStr)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .padEnd(64, "0")
    .slice(0, 64);
  const seedHash = `0x${encoded}` as `0x${string}`;
  const rand = mulberry32(seedFromHex(seedHash));

  const paletteIdx = Math.floor(rand() * COLOR_PALETTES.length);
  const [couleurA, couleurB] = COLOR_PALETTES[paletteIdx];
  const petales = 3 + Math.floor(rand() * 10);
  const humeur = HUMEURS[Math.floor(rand() * HUMEURS.length)] as Humeur;
  const bloc = Math.floor(rand() * 1_000_000);

  return { petales, couleurA, couleurB, humeur, bloc, seedHash };
}

/** Non-deterministic genome using Math.random — for "create new flower" UI. */
export function genomeAleatoire(): Genome {
  const seed =
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return genomeFromSeed(seed);
}

// ── Poetic name generator ────────────────────────────────────────────────────

const NOM_ADJ = [
  "Silken", "Ardent", "Lunar", "Crystal", "Wild", "Celestial",
  "Velvet", "Boreal", "Ethereal", "Blazing", "Frosted", "Solar",
  "Nocturnal", "Dreamy", "Tender", "Electric", "Misty", "Mystic",
];
const NOM_FLEUR = [
  "Corolla", "Peony", "Aurora", "Comet", "Nebula", "Spark",
  "Glow", "Murmur", "Gleam", "Dewdrop", "Ember", "Wave",
  "Dawn", "Reverie", "Flame", "Tide", "Halo", "Prism",
];

/** Deterministic poetic name from a seed hash (stable per flower). */
export function nomPoetique(seedHash: string): string {
  const n = seedFromHex(seedHash);
  const adj = NOM_ADJ[n % NOM_ADJ.length];
  const fleur = NOM_FLEUR[Math.floor(n / 7) % NOM_FLEUR.length];
  return `${adj} ${fleur}`;
}

/** Pre-generated demo seeds for the marketplace. */
const DEMO_SEEDS = [
  "ardent-morning-sun",
  "violet-crystal-moon",
  "deep-ocean-flame",
  "boreal-dawn-dew",
  "emerald-night-storm",
  "golden-cherry-bloom",
  "cobalt-fire-dream",
  "magenta-sky-forest",
  "gold-turquoise-rain",
  "ruby-silver-wind",
  "cyan-cosmos-ember",
  "rose-sapphire-velvet",
];

export const DEMO_FLOWERS = DEMO_SEEDS.map((seed, i) => ({
  id: `demo-${i}`,
  name: seed
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" "),
  genome: genomeFromSeed(seed),
  price: 0.05 + Math.floor(i * 1.3) * 0.05,
  seller: `0x${seed
    .split("")
    .map((c) => c.charCodeAt(0).toString(16))
    .join("")
    .padEnd(40, "0")
    .slice(0, 40)}`,
  listed: true,
  txHash: null as string | null,
}));
