// Rule-based Jardinier — used when ANTHROPIC_API_KEY is absent.
// Parses French keywords from the user message and produces poetic replies
// with genome deltas, so the flower still responds without an LLM.

import type { Delta } from "./genome";
import { HUMEURS, type Humeur } from "./genome";

// ── Color keyword → hex ────────────────────────────────────────────────────

const COLOR_WORDS: [RegExp, string, "a" | "b" | "both"][] = [
  [/rouge/i, "#ff2244", "a"],
  [/rose\s+vif|rose\s+fonce/i, "#ff44aa", "a"],
  [/rose/i, "#ff88cc", "a"],
  [/magenta|fuchsia/i, "#ff00cc", "a"],
  [/violet|pourpre/i, "#9933ff", "both"],
  [/indigo/i, "#6644ff", "b"],
  [/bleu\s+ciel|bleu\s+clair/i, "#44aaff", "b"],
  [/bleu\s+nuit|bleu\s+profond/i, "#001eff", "b"],
  [/bleu/i, "#2244ff", "b"],
  [/cyan|turquoise|aqua/i, "#00ffee", "a"],
  [/vert\s+for[eê]t|vert\s+sombre/i, "#008800", "a"],
  [/vert\s+lime/i, "#aaff00", "a"],
  [/vert/i, "#22ff88", "a"],
  [/jaune\s+or|dor[ée]|or\b/i, "#ffcc00", "a"],
  [/jaune/i, "#ffee00", "a"],
  [/orange/i, "#ff8800", "a"],
  [/blanc|lumineux|lumiere|lumière/i, "#ffffff", "both"],
  [/noir|sombre|nuit/i, "#111133", "both"],
  [/argent|silver/i, "#ccccff", "b"],
  [/arc.en.ciel|rainbow/i, "#ff4488", "a"],
];

// ── Mood keyword ────────────────────────────────────────────────────────────

const MOOD_WORDS: [RegExp, Humeur][] = [
  [/joyeux|joyeuse|heureux|heureuse|content|gai/i, "joyeuse"],
  [/triste|melancolique|mélancolique|sombre|pleurer/i, "melancolique"],
  [/calme|serein|sereine|paisible|tranquil/i, "sereine"],
  [/espi[eè]gle|malic[ie]+ux|malicieuse|faceti|espiègle/i, "espiegle"],
  [/r[eê]ve|r[eê]veuse|r[eê]veur|songe|doux|douce/i, "reveuse"],
];

// ── Reply banks ─────────────────────────────────────────────────────────────

const REPLIES_COLOR = [
  "La teinte se répand dans ses veines… comme une aurore qui éclot.",
  "Je teins ses pétales de cette lumière nouvelle.",
  "Les pigments s'éveillent. Elle boit cette couleur comme une source.",
  "Sa peau change, doucement… absorbant ce flot de lumière.",
  "Un nuage de couleur l'enveloppe, et elle s'y transforme.",
];

const REPLIES_PETALS_MORE = [
  "De nouveaux pétales germent, cherchant la lumière.",
  "Elle s'épanouit davantage, chaque bras un souffle nouveau.",
  "La fleur se complexifie, un fractal vivant.",
  "Ses petits bras s'étendent vers l'infini.",
];

const REPLIES_PETALS_LESS = [
  "Elle se resserre, comme pour mieux contenir sa lumière intérieure.",
  "Moins de pétales, mais chacun plus profond.",
  "La fleur se simplifie, épurée comme un haïku.",
  "Elle rentre en elle-même, concentrant son essence.",
];

const REPLIES_MOOD = [
  "Son âme change… je la sens vibrer différemment.",
  "L'humeur se déplace comme une marée silencieuse.",
  "Elle ressent ce que tu ressens. Sa danse suit ton cœur.",
  "Une nouvelle émotion fleurit en elle.",
];

const REPLIES_GENERIC = [
  "Je l'écoute… et elle répond à ta voix.",
  "Sa forme frémit. Dis-moi encore ce que tu ressens.",
  "Le jardin murmure. La fleur se penche vers tes mots.",
  "Je perçois quelque chose de beau dans tes mots.",
  "Elle pousse, à sa façon, à son rythme silencieux.",
  "Chaque mot que tu prononces est une goutte de rosée pour elle.",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[], n: number): T {
  return arr[Math.abs(n) % arr.length];
}

/** Simple deterministic selector from message content. */
function msgSeed(msg: string): number {
  let h = 2166136261;
  for (let i = 0; i < msg.length; i++) {
    h ^= msg.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// ── Main export ──────────────────────────────────────────────────────────────

export function ruleBasedResponse(
  message: string,
): { reply: string; changes: Delta } {
  const changes: Delta = {};
  const seed = msgSeed(message);
  let replyPool = REPLIES_GENERIC;
  let matched = false;

  // Color detection
  for (const [re, hex, target] of COLOR_WORDS) {
    if (re.test(message)) {
      if (target === "a" || target === "both") changes.couleurA = hex;
      if (target === "b" || target === "both") changes.couleurB = hex;
      replyPool = REPLIES_COLOR;
      matched = true;
      break;
    }
  }

  // Petal-count detection (check BEFORE generic number match)
  const morePetals = /plus.*p[eé]tale|p[eé]tale.*plus|ajoute.*p[eé]tal|davantage|agrandir|plus grand/i.test(message);
  const lessPetals = /moins.*p[eé]tale|p[eé]tale.*moins|enlève.*p[eé]tal|enleve.*p[eé]tal|simplifi|r[eé]duis/i.test(message);

  if (morePetals) {
    changes.petales = "+2";
    replyPool = REPLIES_PETALS_MORE;
    matched = true;
  } else if (lessPetals) {
    changes.petales = "-2";
    replyPool = REPLIES_PETALS_LESS;
    matched = true;
  } else {
    const numMatch = message.match(/\b([3-9]|1[0-2])\s*p[eé]tal/i);
    if (numMatch) {
      changes.petales = parseInt(numMatch[1], 10);
      replyPool = REPLIES_PETALS_MORE;
      matched = true;
    }
  }

  // Mood detection
  for (const [re, humeur] of MOOD_WORDS) {
    if (re.test(message)) {
      changes.humeur = humeur;
      replyPool = REPLIES_MOOD;
      matched = true;
      break;
    }
  }

  // If nothing matched, add a small random color nudge so the flower at least
  // visually reacts even in fallback mode.
  if (!matched) {
    const hues = [
      "#ff6ec7", "#7a5cff", "#00ff88", "#ffdd00", "#00ffee",
      "#ff8800", "#ff3399", "#33ccff", "#ff0066", "#88ff00",
    ];
    const idx = seed % hues.length;
    changes.couleurA = hues[idx];
    changes.couleurB = hues[(idx + 5) % hues.length];
  }

  return { reply: pick(replyPool, seed), changes };
}
