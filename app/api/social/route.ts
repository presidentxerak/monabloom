import { NextResponse } from "next/server";

export const runtime = "nodejs";

export interface ChatMsg { id: string; owner: string; text: string; ts: number }

const KEY = "blitz_chat";
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const SEED: { owner: string; text: string }[] = [
  { owner: "neuno", text: "gm garden! who's growing today?" },
  { owner: "bloomgrl", text: "my Legendary just hit rank #14, so proud of her" },
  { owner: "petalpope", text: "anyone want to breed? I have a Rare with a crown" },
  { owner: "glowbean", text: "the techno track makes mine spin so hard lol" },
  { owner: "saffron", text: "selling a Tulip-shape Epic for 0.3 MON, dm" },
  { owner: "nyx", text: "thug life glasses are the best accessory, fight me" },
  { owner: "marigold", text: "just inscribed mine on chain, feels permanent now" },
  { owner: "terramint", text: "what's everyone's favourite mood? mine is espiegle" },
];

function seeded(): ChatMsg[] {
  const base = Date.now() - SEED.length * 60000;
  return SEED.map((m, i) => ({ id: `seed-${i}`, owner: m.owner, text: m.text, ts: base + i * 60000 }));
}

// In-memory fallback (shared within a warm serverless instance).
let mem: ChatMsg[] | null = null;

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const data = await res.json();
  return data.result;
}

async function ensureSeed() {
  const len = Number(await redis(["LLEN", KEY])) || 0;
  if (len === 0) for (const m of seeded()) await redis(["RPUSH", KEY, JSON.stringify(m)]);
}

async function readAll(): Promise<ChatMsg[]> {
  if (URL && TOKEN) {
    try {
      await ensureSeed();
      const arr = (await redis(["LRANGE", KEY, "0", "199"])) as string[];
      return arr.map((s) => JSON.parse(s) as ChatMsg);
    } catch (e) {
      console.error("[social] redis read failed:", (e as Error).message);
    }
  }
  if (!mem) mem = seeded();
  return mem;
}

async function add(owner: string, text: string): Promise<ChatMsg[]> {
  const msg: ChatMsg = { id: `m-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, owner, text, ts: Date.now() };
  if (URL && TOKEN) {
    try {
      await ensureSeed();
      await redis(["RPUSH", KEY, JSON.stringify(msg)]);
      await redis(["LTRIM", KEY, "-200", "-1"]);
      const arr = (await redis(["LRANGE", KEY, "0", "199"])) as string[];
      return arr.map((s) => JSON.parse(s) as ChatMsg);
    } catch (e) {
      console.error("[social] redis write failed:", (e as Error).message);
    }
  }
  if (!mem) mem = seeded();
  mem.push(msg);
  mem = mem.slice(-200);
  return mem;
}

function clean(s: unknown, max: number): string {
  // Strip control characters, collapse whitespace, cap length.
  return String(s ?? "")
    .split("")
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function GET() {
  return NextResponse.json({ messages: await readAll() });
}

export async function POST(req: Request) {
  let body: { owner?: string; text?: string } = {};
  try { body = await req.json(); } catch {}
  const owner = clean(body.owner || "guest", 24) || "guest";
  const text = clean(body.text, 240);
  if (!text) return NextResponse.json({ messages: await readAll() });
  return NextResponse.json({ messages: await add(owner, text) });
}
