// Rule-based Gardener — used when ANTHROPIC_API_KEY is absent or the LLM fails.
// Parses English keywords from the user message and produces poetic replies
// with genome deltas, so the flower always responds without an LLM.

import type { Delta } from "./genome";
import type { Humeur, Hat, Glasses, Shoes } from "./genome";

// ── Accessory + shape keywords ──────────────────────────────────────────────

const HAT_WORDS: [RegExp, Hat][] = [
  [/no hat|remove (the )?hat|bare ?head/i, "none"],
  [/party|birthday|cone hat/i, "party"],
  [/top ?hat|gentleman/i, "tophat"],
  [/crown|king|queen|royal/i, "crown"],
  [/beret|french hat|artist/i, "beret"],
  [/\bcap\b|baseball|hat/i, "cap"],
];
const GLASSES_WORDS: [RegExp, Glasses][] = [
  [/no glasses|remove (the )?glasses/i, "none"],
  [/thug ?life|pixel/i, "thug"],
  [/heart glasses|love glasses/i, "heart"],
  [/round glasses|nerd|harry/i, "round"],
  [/star glasses|star shades/i, "star"],
  [/sunglasses|shades|sun glasses|cool/i, "sun"],
];
const SHOE_WORDS: [RegExp, Shoes][] = [
  [/boots?/i, "boot"],
  [/sandals?|flip ?flop/i, "sandal"],
  [/platform/i, "platform"],
  [/red (high|shoes|sneakers)|high ?tops?/i, "redhi"],
  [/classic shoes|dress shoes|loafer/i, "classic"],
  [/sneakers?|trainers?|kicks/i, "sneaker"],
];
const SHAPE_WORDS: [RegExp, number][] = [
  [/round petal|blob petal|bubble petal/i, 1],
  [/diamond|crystal petal|faceted/i, 2],
  [/tube|capsule|cylinder petal/i, 3],
  [/pointed|spiky|spike|teardrop|star petal/i, 4],
  [/ring petal|donut petal|loop petal/i, 5],
  [/bead petal|pearl petal/i, 6],
  [/oval petal|classic petal|simple petal/i, 0],
];

// ── Colour keyword → hex ────────────────────────────────────────────────────

const COLOR_WORDS: [RegExp, string, "a" | "b" | "both"][] = [
  [/\bred\b|crimson|scarlet/i, "#ff2244", "a"],
  [/hot\s*pink|magenta|fuchsia/i, "#ff00cc", "a"],
  [/\bpink\b|rose/i, "#ff88cc", "a"],
  [/purple|violet|indigo/i, "#9933ff", "both"],
  [/sky\s*blue|light\s*blue/i, "#44aaff", "b"],
  [/navy|deep\s*blue|midnight/i, "#001eff", "b"],
  [/\bblue\b/i, "#2244ff", "b"],
  [/cyan|turquoise|teal|aqua/i, "#00ffee", "a"],
  [/lime/i, "#aaff00", "a"],
  [/forest|dark\s*green/i, "#008800", "a"],
  [/\bgreen\b/i, "#22ff88", "a"],
  [/gold|golden/i, "#ffcc00", "a"],
  [/\byellow\b/i, "#ffee00", "a"],
  [/orange|amber/i, "#ff8800", "a"],
  [/white|bright|light/i, "#ffffff", "both"],
  [/black|dark|night/i, "#111133", "both"],
  [/silver/i, "#ccccff", "b"],
  [/rainbow/i, "#ff4488", "a"],
];

// ── Mood keyword → internal mood id ─────────────────────────────────────────

const MOOD_WORDS: [RegExp, Humeur][] = [
  [/happy|joyful|cheerful|glad|merry/i, "joyeuse"],
  [/sad|melancholy|blue|gloomy|cry/i, "melancolique"],
  [/calm|serene|peaceful|quiet|still/i, "sereine"],
  [/playful|mischievous|cheeky|silly|fun/i, "espiegle"],
  [/dream|dreamy|soft|gentle|tender/i, "reveuse"],
];

// ── Reply banks ─────────────────────────────────────────────────────────────

const REPLIES_COLOR = [
  "The hue spreads through her veins… like a dawn unfolding.",
  "I dye her petals with this new light.",
  "The pigments wake. She drinks this colour like a spring.",
  "Her skin shifts, slowly… soaking in this flood of light.",
  "A cloud of colour wraps around her, and she becomes it.",
];

const REPLIES_PETALS_MORE = [
  "New petals sprout, reaching for the light.",
  "She blooms further, each arm a fresh breath.",
  "The flower grows more intricate, a living fractal.",
  "Her little arms stretch toward the infinite.",
];

const REPLIES_PETALS_LESS = [
  "She draws inward, the better to hold her inner light.",
  "Fewer petals, but each one deeper.",
  "The flower simplifies, pure as a haiku.",
  "She folds into herself, concentrating her essence.",
];

const REPLIES_MOOD = [
  "Her soul shifts… I feel her vibrate differently.",
  "The mood moves like a silent tide.",
  "She feels what you feel. Her dance follows your heart.",
  "A new emotion blooms within her.",
];

const REPLIES_GENERIC = [
  "I'm listening… and she answers your voice.",
  "Her shape trembles. Tell me more of what you feel.",
  "The garden murmurs. The flower leans toward your words.",
  "I sense something beautiful in your words.",
  "She grows, in her own way, at her own quiet pace.",
  "Every word you speak is a drop of dew for her.",
];

const REPLIES_DRESS = [
  "She tries it on, delighted with her new look.",
  "A little style suits her perfectly.",
  "Dressed up and glowing — she twirls for you.",
  "Her new accessory catches the light.",
];

const REPLIES_SHAPE = [
  "Her petals reshape themselves, fluid as wax.",
  "A new silhouette unfolds, petal by petal.",
  "She rearranges her form to please you.",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[], n: number): T {
  return arr[Math.abs(n) % arr.length];
}

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

  // Colour detection.
  for (const [re, hex, target] of COLOR_WORDS) {
    if (re.test(message)) {
      if (target === "a" || target === "both") changes.couleurA = hex;
      if (target === "b" || target === "both") changes.couleurB = hex;
      replyPool = REPLIES_COLOR;
      matched = true;
      break;
    }
  }

  // Petal-count detection.
  const morePetals = /more petal|add petal|bigger|grow|fuller/i.test(message);
  const lessPetals = /less petal|fewer petal|remove petal|simpler|reduce|smaller/i.test(message);

  if (morePetals) {
    changes.petales = "+2";
    replyPool = REPLIES_PETALS_MORE;
    matched = true;
  } else if (lessPetals) {
    changes.petales = "-2";
    replyPool = REPLIES_PETALS_LESS;
    matched = true;
  } else {
    const numMatch = message.match(/\b([3-9]|1[0-2])\s*petal/i);
    if (numMatch) {
      changes.petales = parseInt(numMatch[1], 10);
      replyPool = REPLIES_PETALS_MORE;
      matched = true;
    }
  }

  // Mood detection.
  for (const [re, humeur] of MOOD_WORDS) {
    if (re.test(message)) {
      changes.humeur = humeur;
      replyPool = REPLIES_MOOD;
      matched = true;
      break;
    }
  }

  // Accessories — hats / glasses / shoes.
  for (const [re, hat] of HAT_WORDS) {
    if (re.test(message)) { changes.chapeau = hat; replyPool = REPLIES_DRESS; matched = true; break; }
  }
  for (const [re, glasses] of GLASSES_WORDS) {
    if (re.test(message)) { changes.lunettes = glasses; replyPool = REPLIES_DRESS; matched = true; break; }
  }
  for (const [re, shoes] of SHOE_WORDS) {
    if (re.test(message)) { changes.chaussures = shoes; replyPool = REPLIES_DRESS; matched = true; break; }
  }

  // Petal shape.
  for (const [re, forme] of SHAPE_WORDS) {
    if (re.test(message)) { changes.forme = forme; replyPool = REPLIES_SHAPE; matched = true; break; }
  }

  // Nothing matched → a small random colour nudge so the flower still reacts.
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
