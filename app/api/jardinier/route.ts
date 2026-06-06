import { NextResponse } from "next/server";
import {
  GenomeSchema,
  applyDelta,
  genomeDefaut,
  type Delta,
  type Genome,
} from "@/lib/genome";
import { buildSystemPrompt } from "@/lib/jardinier-prompt";
import {
  RateLimitError,
  inscrireGenome,
  lireGrainePourGermination,
} from "@/lib/monad";
import { ruleBasedResponse } from "@/lib/jardinier-fallback";
import { generateCascade, configuredProviders } from "@/lib/llm";

export const runtime = "nodejs";

const MAX_HISTORY = 12;

/** Diagnostics: which LLM providers are active (no secrets exposed). */
export async function GET() {
  const providers = configuredProviders();
  // "pollinations" is the keyless free fallback; anything else means a real key.
  const smart = providers.some((p) => p !== "pollinations");
  return NextResponse.json({ providers, smart, keyless: providers.includes("pollinations") });
}
const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;
const PLACEHOLDER_HASH = "0x" + "0".repeat(64);

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

  // ── Chat branch — HYBRID: rule-based (exact) + LLM cascade. ──
  // Rules give precise, deterministic mappings for named commands; the LLM
  // handles the long tail. We merge them so a command ALWAYS produces a change
  // when the player clearly asked for one.
  const rule = ruleBasedResponse(userMsg);

  let llm = null;
  try {
    llm = await generateCascade(buildSystemPrompt(genome), history);
  } catch (err) {
    console.error("[jardinier] cascade error:", err);
  }

  let changes: Delta;
  let reply: string;
  if (llm) {
    const llmHasChanges = Object.keys(llm.changes).length > 0;
    if (llmHasChanges) {
      // Trust the LLM, but let a CONFIDENT keyword match override for exactness
      // (so "make her red" is always #ff2244, never the model's guess).
      changes = rule.confident ? { ...llm.changes, ...rule.changes } : llm.changes;
    } else {
      // The LLM only chatted — apply whatever the rules caught so she reacts.
      changes = rule.changes;
    }
    reply = llm.reply;
  } else {
    changes = rule.changes;
    reply = rule.reply;
  }

  const nextGenome = applyDelta(genome, changes);
  return NextResponse.json({ reply, changes, genome: nextGenome });
}
