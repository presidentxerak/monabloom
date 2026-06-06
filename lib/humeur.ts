import type { Humeur } from "./genome";

export interface HumeurMeta {
  /** Pulsation speed multiplier applied to the breathing animation. */
  pulse: number;
  /** ASCII face, eyes open. */
  open: string;
  /** ASCII face during a blink. */
  blink: string;
  /** Human label for the mouth (documentation / accessibility). */
  bouche: string;
}

// Mapping humeur → ASCII face + rhythm. This is UI/DOM data (monospace overlay),
// never baked into the deterministic canvas render.
export const HUMEUR_META: Record<Humeur, HumeurMeta> = {
  joyeuse: { pulse: 1.2, open: "(◕‿◕)", blink: "(◡‿◡)", bouche: "sourire" },
  reveuse: { pulse: 0.8, open: "(✿˘︶˘)", blink: "(✿-‿-)", bouche: "douce" },
  melancolique: {
    pulse: 0.6,
    open: "(´•̥ ̯ •̥)",
    blink: "(´-̥ ̯ -̥)",
    bouche: "triste",
  },
  espiegle: { pulse: 1.4, open: "(=^･ω･^=)", blink: "(=^-ω-^=)", bouche: "chat" },
  sereine: { pulse: 1.0, open: "( ˘ ᵕ ˘ )", blink: "( - ᵕ - )", bouche: "neutre" },
};

/** English display labels for the (internal, on-chain) mood ids. */
export const HUMEUR_LABEL: Record<Humeur, string> = {
  joyeuse: "joyful",
  reveuse: "dreamy",
  melancolique: "melancholic",
  espiegle: "playful",
  sereine: "serene",
};
