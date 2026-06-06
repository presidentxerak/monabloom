"use client";

// Tiny localStorage-backed social feed for the Blitz Garden, seeded with
// messages from (fake) owners so the space feels alive.

export interface ChatMsg { id: string; owner: string; text: string; ts: number }

const KEY = "blitz_chat";

const SEED: { owner: string; text: string }[] = [
  { owner: "neuno", text: "gm garden! who's minting today?" },
  { owner: "bloomgrl", text: "my Legendary just hit rank #14, so proud of her" },
  { owner: "petalpope", text: "anyone want to breed? I have a Rare with a crown" },
  { owner: "glowbean", text: "the techno track makes mine spin so hard lol" },
  { owner: "saffron", text: "selling a Tulip-shape Epic for 0.3 MON, dm" },
  { owner: "nyx", text: "thug life glasses are the best accessory, fight me" },
  { owner: "marigold", text: "just inscribed mine on chain, feels permanent now" },
  { owner: "terramint", text: "what's everyone's favourite mood? mine is espiegle" },
];

export function loadChat(): ChatMsg[] {
  if (typeof window === "undefined") return seeded();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seeded();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return seeded();
  }
}

function seeded(): ChatMsg[] {
  const base = Date.now() - SEED.length * 60000;
  return SEED.map((m, i) => ({ id: `seed-${i}`, owner: m.owner, text: m.text, ts: base + i * 60000 }));
}

export function postChat(text: string, owner = "you"): ChatMsg[] {
  const msgs = loadChat();
  msgs.push({ id: `m-${Date.now()}`, owner, text, ts: Date.now() });
  const trimmed = msgs.slice(-200);
  try { localStorage.setItem(KEY, JSON.stringify(trimmed)); } catch {}
  return trimmed;
}
