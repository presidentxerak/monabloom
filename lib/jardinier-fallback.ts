// Rule-based Gardener — used when ANTHROPIC_API_KEY is absent or the LLM fails.
// Maps English commands to exact genome deltas so the flower changes precisely
// to match what the player asked. Unrecognised input changes nothing.

import type { Delta } from "./genome";
import type { Humeur, Hat, Glasses, Shoes } from "./genome";

// ── Colours (specific combos first, word-bounded) ───────────────────────────

const COLOR_WORDS: [RegExp, string, "a" | "b" | "both"][] = [
  [/dark red|blood red|maroon/i, "#aa1133", "a"],
  [/\bred\b|crimson|scarlet|cherry/i, "#ff2244", "a"],
  [/hot ?pink|magenta|fuchsia/i, "#ff14b0", "a"],
  [/\bpink\b|rose|blush/i, "#ff88cc", "a"],
  [/purple|violet|lavender/i, "#9933ff", "both"],
  [/indigo/i, "#5b3bff", "b"],
  [/sky ?blue|light ?blue|baby ?blue/i, "#5bb8ff", "b"],
  [/navy|dark ?blue|midnight|deep ?blue/i, "#13228f", "b"],
  [/\bblue\b|azure|cobalt/i, "#2a55ff", "b"],
  [/cyan|turquoise|teal|aqua/i, "#00e5d0", "a"],
  [/\blime\b/i, "#9be000", "a"],
  [/dark ?green|forest|emerald/i, "#0a8a2e", "a"],
  [/\bgreen\b|\bmint\b/i, "#22cc77", "a"],
  [/gold|golden|amber/i, "#ffc02e", "a"],
  [/\byellow\b|lemon|sunny/i, "#ffe000", "a"],
  [/orange|tangerine|peach/i, "#ff8a00", "a"],
  [/\bwhite\b|snow|ivory/i, "#f4eeff", "both"],
  [/\bblack\b|onyx/i, "#1a1430", "both"],
  [/silver|\bgrey\b|\bgray\b/i, "#b9c0d6", "b"],
];

const RAINBOW = /rainbow|colou?rful|multicolou?r/i;
const CHANGE_COLOR = /(change|new|different|random|surprise|switch).{0,12}(colou?r|hue|shade)|(colou?r|hue|shade).{0,12}(change|swap)/i;

// ── Moods ────────────────────────────────────────────────────────────────────

const MOOD_WORDS: [RegExp, Humeur][] = [
  [/happy|joyful|cheerful|glad|merry|excited/i, "joyeuse"],
  [/sad|melancholy|gloomy|cry|blue mood|down|lonely/i, "melancolique"],
  [/calm|serene|peaceful|quiet|still|zen|relax/i, "sereine"],
  [/playful|mischievous|cheeky|silly|fun|naughty/i, "espiegle"],
  [/dream|dreamy|soft|gentle|tender|sleepy/i, "reveuse"],
];

// ── Accessories (word-bounded so "what" can't match "hat") ───────────────────

const HAT_WORDS: [RegExp, Hat][] = [
  [/no hat|remove (the )?hat|take off (the )?hat|bare ?head/i, "none"],
  [/party hat|birthday|cone hat/i, "party"],
  [/top ?hat|gentleman|fancy hat/i, "tophat"],
  [/crown|king|queen|royal|tiara/i, "crown"],
  [/beret|french hat|artist hat/i, "beret"],
  [/\bcap\b|baseball cap|\bhat\b/i, "cap"],
];
const GLASSES_WORDS: [RegExp, Glasses][] = [
  [/no glasses|remove (the )?glasses|take off (the )?glasses/i, "none"],
  [/thug ?life|pixel glasses/i, "thug"],
  [/heart glasses|love glasses/i, "heart"],
  [/round glasses|nerd glasses/i, "round"],
  [/star glasses|star shades/i, "star"],
  [/sunglasses|\bshades\b|sun glasses/i, "sun"],
];
const SHOE_WORDS: [RegExp, Shoes][] = [
  [/\bboots?\b/i, "boot"],
  [/sandals?|flip ?flops?/i, "sandal"],
  [/platforms?/i, "platform"],
  [/red (high|shoes|sneakers)|high ?tops?/i, "redhi"],
  [/classic shoes|dress shoes|loafers?/i, "classic"],
  [/sneakers?|trainers?|kicks|shoes/i, "sneaker"],
];
const SHAPE_WORDS: [RegExp, number][] = [
  [/round petals?|blob petals?|bubble petals?/i, 1],
  [/diamond petals?|crystal petals?|faceted/i, 2],
  [/tube petals?|capsule petals?|cylinder petals?/i, 3],
  [/pointed|spiky|spike|teardrop|star petals?|sharp petals?/i, 4],
  [/ring petals?|donut petals?|loop petals?/i, 5],
  [/bead petals?|pearl petals?/i, 6],
  [/oval petals?|classic petals?|simple petals?/i, 0],
];

// ── Reply banks ──────────────────────────────────────────────────────────────

const R_COLOR = [
  "The hue spreads through her veins, like a dawn unfolding.",
  "I dye her petals with this new light.",
  "Her colours shift, soaking in this new shade.",
];
const R_PETALS_MORE = ["New petals sprout, reaching for the light.", "She blooms fuller, each arm a fresh breath."];
const R_PETALS_LESS = ["She draws inward, simpler and deeper.", "Fewer petals, but each one truer."];
const R_MOOD = ["Her soul shifts — I feel her vibrate differently.", "A new emotion blooms within her."];
const R_DRESS = ["She tries it on, delighted with her new look.", "A little style suits her perfectly.", "Dressed up and glowing, she twirls for you."];
const R_SHAPE = ["Her petals reshape themselves, fluid as wax.", "A new silhouette unfolds, petal by petal."];
const R_NONE = [
  "Tell me a colour, a mood, a hat, glasses, shoes, or a petal shape — and I'll make it so.",
  "I'm listening. Try \"make her blue\", \"give her sunglasses\", or \"pointed petals\".",
  "Whisper a wish — a colour, an emotion, an accessory — and she'll answer.",
];

function pick<T>(arr: T[], n: number): T { return arr[Math.abs(n) % arr.length]; }
function msgSeed(msg: string): number {
  let h = 2166136261;
  for (let i = 0; i < msg.length; i++) { h ^= msg.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

const RANDOM_PAIRS: [string, string][] = [
  ["#ff6ec7", "#7a5cff"], ["#00e5d0", "#ff5b9a"], ["#ffd000", "#ff5400"],
  ["#7bd1ff", "#b06bff"], ["#ff3aa0", "#3ad0ff"], ["#9be000", "#ff2e88"],
];

// ── Main ─────────────────────────────────────────────────────────────────────

export function ruleBasedResponse(message: string): { reply: string; changes: Delta } {
  const changes: Delta = {};
  const seed = msgSeed(message);
  let reply = R_NONE;
  let matched = false;
  // priority of the reply line: accessory/shape > petals > mood > colour
  let priority = 0;
  const bump = (pool: string[], pr: number) => { if (pr >= priority) { priority = pr; reply = pool; } matched = true; };

  // Colour
  if (RAINBOW.test(message)) {
    changes.couleurA = "#ff3aa0"; changes.couleurB = "#3ad0ff"; bump(R_COLOR, 1);
  } else {
    let hit = false;
    for (const [re, hex, target] of COLOR_WORDS) {
      if (re.test(message)) {
        if (target === "a" || target === "both") changes.couleurA = hex;
        if (target === "b" || target === "both") changes.couleurB = hex;
        bump(R_COLOR, 1); hit = true; break;
      }
    }
    if (!hit && CHANGE_COLOR.test(message)) {
      const [a, b] = RANDOM_PAIRS[seed % RANDOM_PAIRS.length];
      changes.couleurA = a; changes.couleurB = b; bump(R_COLOR, 1);
    }
  }

  // Petals
  if (/more petals?|add petals?|fuller|bigger flower|bushier/i.test(message)) { changes.petales = "+2"; bump(R_PETALS_MORE, 2); }
  else if (/less petals?|fewer petals?|remove petals?|simpler|smaller flower|minimal/i.test(message)) { changes.petales = "-2"; bump(R_PETALS_LESS, 2); }
  else {
    const num = message.match(/\b([3-9]|1[0-2])\s*petals?\b/i);
    if (num) { changes.petales = parseInt(num[1], 10); bump(R_PETALS_MORE, 2); }
  }

  // Mood
  for (const [re, humeur] of MOOD_WORDS) { if (re.test(message)) { changes.humeur = humeur; bump(R_MOOD, 3); break; } }

  // Accessories
  for (const [re, hat] of HAT_WORDS) { if (re.test(message)) { changes.chapeau = hat; bump(R_DRESS, 4); break; } }
  for (const [re, gl] of GLASSES_WORDS) { if (re.test(message)) { changes.lunettes = gl; bump(R_DRESS, 4); break; } }
  for (const [re, sh] of SHOE_WORDS) { if (re.test(message)) { changes.chaussures = sh; bump(R_DRESS, 4); break; } }

  // Petal shape
  for (const [re, forme] of SHAPE_WORDS) { if (re.test(message)) { changes.forme = forme; bump(R_SHAPE, 4); break; } }

  return { reply: pick(reply, seed), changes: matched ? changes : {} };
}
