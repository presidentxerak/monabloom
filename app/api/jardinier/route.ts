import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  GenomeSchema,
  applyDelta,
  genomeDefaut,
  parseJardinierReply,
  type Genome,
} from "@/lib/genome";
import { buildSystemPrompt } from "@/lib/jardinier-prompt";
import {
  RateLimitError,
  inscrireGenome,
  lireGrainePourGermination,
} from "@/lib/monad";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-5";
const MAX_HISTORY = 12;
const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;
const PLACEHOLDER_HASH = "0x" + "0".repeat(64);

const REPLI_DOUX =
  "Le vent a emporté mes mots… mais ta fleur tient bon. Redis-moi ton envie ?";

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Ensure the genome carries a real on-chain seed before it matters. */
async function ensureSeed(genome: Genome): Promise<Genome> {
  if (genome.bloc > 0 && genome.seedHash !== PLACEHOLDER_HASH) return genome;
  try {
    const { bloc, seedHash } = await lireGrainePourGermination();
    return { ...genome, bloc, seedHash };
  } catch {
    // RPC unreachable (e.g. local dev without funding): keep a deterministic
    // non-zero fallback so the flower still renders. It will be re-seeded the
    // next time the chain is reachable, and whatever seed is present at
    // inscription is the one stored forever.
    return genome.seedHash === PLACEHOLDER_HASH
      ? { ...genome, seedHash: genomeDefaut().seedHash }
      : genome;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { reply: REPLI_DOUX, changes: {}, genome: genomeDefaut() },
      { status: 200 },
    );
  }

  const { messages, genome: rawGenome } = (body ?? {}) as {
    messages?: ChatMessage[];
    genome?: unknown;
  };

  // Validate the incoming genome; fall back to the default if the client sent
  // something malformed (the visual must never break).
  const parsedGenome = GenomeSchema.safeParse(rawGenome);
  let genome: Genome = parsedGenome.success ? parsedGenome.data : genomeDefaut();
  genome = await ensureSeed(genome);

  const history = Array.isArray(messages) ? messages.slice(-MAX_HISTORY) : [];
  const lastUser = [...history].reverse().find((m) => m.role === "user");

  // ── Inscription branch: a valid address in the latest user message wins. ──
  const addressMatch = lastUser?.content.match(ADDRESS_RE);
  if (addressMatch) {
    try {
      const result = await inscrireGenome(genome, addressMatch[0]);
      return NextResponse.json({
        reply: "Je la plante… Elle est désormais inscrite pour l'éternité. 🌱",
        changes: {},
        genome,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        blockNumber: result.blockNumber,
      });
    } catch (err) {
      if (err instanceof RateLimitError) {
        return NextResponse.json(
          { reply: err.message, changes: {}, genome },
          { status: 429 },
        );
      }
      console.error("[jardinier] inscription failed:", err);
      return NextResponse.json(
        {
          reply:
            "La terre n'a pas voulu d'elle cette fois… Vérifie ton adresse et réessaie.",
          changes: {},
          genome,
        },
        { status: 200 },
      );
    }
  }

  // ── Chat branch. ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[jardinier] ANTHROPIC_API_KEY missing — graceful fallback.");
    return NextResponse.json({
      reply:
        "Mes racines ne touchent pas encore la source… (clé API absente). Mais la fleur t'écoute.",
      changes: {},
      genome,
    });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: buildSystemPrompt(genome),
      messages: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const parsed = parseJardinierReply(text);
    if (!parsed) {
      // Validation failed: show the doux fallback, genome does NOT move.
      console.warn("[jardinier] unparseable LLM output:", text.slice(0, 200));
      return NextResponse.json({ reply: REPLI_DOUX, changes: {}, genome });
    }

    // Apply the delta server-side — the server stays the authority.
    const nextGenome = applyDelta(genome, parsed.changes);
    return NextResponse.json({
      reply: parsed.reply,
      changes: parsed.changes,
      genome: nextGenome,
    });
  } catch (err) {
    console.error("[jardinier] LLM call failed:", err);
    return NextResponse.json({ reply: REPLI_DOUX, changes: {}, genome });
  }
}
