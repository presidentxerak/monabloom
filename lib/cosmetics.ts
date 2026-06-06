import { HATS, GLASSES, SHOES, type Hat, type Glasses, type Shoes } from "./genome";

export const HAT_LABELS: Record<Hat, string> = {
  none: "None",
  cap: "Cap",
  party: "Party",
  tophat: "Top hat",
  crown: "Crown",
  beret: "Beret",
};

export const GLASSES_LABELS: Record<Glasses, string> = {
  none: "None",
  sun: "Sunglasses",
  thug: "Thug life",
  heart: "Heart",
  round: "Round",
  star: "Star",
};

export const SHOES_LABELS: Record<Shoes, string> = {
  sneaker: "Sneakers",
  boot: "Boots",
  sandal: "Sandals",
  platform: "Platforms",
  classic: "Classic",
  redhi: "Red high",
};

export const HAT_LIST = HATS;
export const GLASSES_LIST = GLASSES;
export const SHOES_LIST = SHOES;

// Rarity weight for cosmetics (higher = rarer), feeds the rarity score.
export const HAT_RARITY: Record<Hat, number> = {
  none: 0, cap: 6, party: 12, beret: 14, tophat: 20, crown: 28,
};
export const GLASSES_RARITY: Record<Glasses, number> = {
  none: 0, round: 6, sun: 10, star: 16, heart: 18, thug: 24,
};

// ── Dances ───────────────────────────────────────────────────────────────────

export interface DanceMeta { id: number; name: string; }
export const DANCES: DanceMeta[] = [
  { id: 0, name: "Idle" },
  { id: 1, name: "Wave" },
  { id: 2, name: "Twist" },
  { id: 3, name: "Jump" },
  { id: 4, name: "Robot" },
  { id: 5, name: "Spin" },
];

// ── Music genres ─────────────────────────────────────────────────────────────

export interface GenreMeta { id: string; label: string; }
export const GENRES: GenreMeta[] = [
  { id: "crystal", label: "Crystal" },
  { id: "lofi", label: "Lo-fi" },
  { id: "arcade", label: "Arcade" },
  { id: "forest", label: "Forest" },
];
