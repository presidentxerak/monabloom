import { NextResponse } from "next/server";
import {
  GenomeSchema,
  applyDelta,
  genomeDefaut,
  type Genome,
} from "@/lib/genome";
import { buildSystemPrompt } from "@/lib/jardinier-prompt";
import {
  RateLimitError,
  inscrireGenome,
  lireGrainePourGermination,
} from "@/lib/monad";
import { ruleBasedResponse } from "@/lib/jardinier-fallback";
import { generateCascade } from "@/lib/llm";

export const runtime = "nodejs";

const MAX_HISTORY = 12;
const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;
const PLACEHOLDER_HASH = "0x" + "0".repeat(64);

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Universal fallback: whenever the LLM is unavailable or returns something
 * unusable, fall back to the rule-based gardener so the flower ALWAYS reacts.
 * The flower must never feel "dead".
 */
function fallbackResponse(genome: Genome, userMsg: string) {
  const { reply, changes } = ruleBasedResponse(userMsg);
  const nextGenome = applyDelta(genome, changes);
  return NextResponse.json({ reply, changes, genome: nextGenome });
}

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
      {
        reply: "Tell me your wish again? The garden is listening.",
        changes: {},
        genome: genomeDefaut(),
      },
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
  const userMsg = lastUser?.content ?? "";

  // ── Inscription branch: a valid address in the latest user message wins. ──
  const addressMatch = lastUser?.content.match(ADDRESS_RE);
  if (addressMatch) {
    try {
      const result = await inscrireGenome(genome, addressMatch[0]);
      return NextResponse.json({
        reply: "Planting it… She is now inscribed forever.",
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
            "The soil refused her this time… Check your address and try again.",
          changes: {},
          genome,
        },
        { status: 200 },
      );
    }
  }

  // ── Chat branch — LLM cascade (Anthropic → Cerebras → Groq → Gemini →
  //    OpenRouter → Mistral), then the rule-based gardener as a safety net. ──
  let result = null;
  try {
    result = await generateCascade(buildSystemPrompt(genome), history);
  } catch (err) {
    console.error("[jardinier] cascade error:", err);
  }
  if (!result) return fallbackResponse(genome, userMsg);

  // Apply the delta server-side — the server stays the authority.
  const nextGenome = applyDelta(genome, result.changes);
  return NextResponse.json({
    reply: result.reply,
    changes: result.changes,
    genome: nextGenome,
  });
}
