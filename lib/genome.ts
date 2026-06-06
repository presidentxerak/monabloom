import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export const HUMEURS = [
  "joyeuse",
  "reveuse",
  "melancolique",
  "espiegle",
  "sereine",
] as const;

export type Humeur = (typeof HUMEURS)[number];

export interface Genome {
  petales: number; // integer, clamped [3, 12]
  couleurA: string; // hex #rrggbb
  couleurB: string; // hex #rrggbb
  humeur: Humeur;
  bloc: number; // Monad block number read at germination (seed)
  seedHash: string; // hash of that block (source of organic noise)
}

export const PETALES_MIN = 3;
export const PETALES_MAX = 12;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const GENOME_DEFAUT: Omit<Genome, "bloc" | "seedHash"> = {
  petales: 5,
  couleurA: "#ff6ec7",
  couleurB: "#7a5cff",
  humeur: "sereine",
};

// A fixed, non-zero "garden seed" so the very first render already has organic
// variation, even before the chain has been read. Replaced by a real block
// hash at germination.
export const SEED_DEFAUT =
  "0x6d6f6e61626c6f6f6d6772616e6573656564000000000000000000000000beef";

/** A fully-formed default genome (seed filled with the garden placeholder). */
export function genomeDefaut(bloc = 0, seedHash = SEED_DEFAUT): Genome {
  return { ...GENOME_DEFAUT, bloc, seedHash };
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────────────────

const HexColor = z.string().regex(HEX_RE, "couleur hex invalide");

/** The full genome as it lives on-chain. */
export const GenomeSchema = z
  .object({
    petales: z.number().int().min(PETALES_MIN).max(PETALES_MAX),
    couleurA: HexColor,
    couleurB: HexColor,
    humeur: z.enum(HUMEURS),
    bloc: z.number().int().nonnegative(),
    seedHash: z.string().regex(/^0x[0-9a-fA-F]+$/, "seedHash hex invalide"),
  })
  .strict();

/**
 * A delta is what the Jardinier (LLM) is allowed to return. Every key is
 * optional. Unknown keys are rejected (.strict). The petales field accepts an
 * absolute integer OR a relative string like "+2" / "-1".
 */
export const DeltaSchema = z
  .object({
    petales: z
      .union([
        z.number().int(),
        z.string().regex(/^[+-]\d+$/, "delta pétales relatif invalide"),
      ])
      .optional(),
    couleurA: HexColor.optional(),
    couleurB: HexColor.optional(),
    humeur: z.enum(HUMEURS).optional(),
  })
  .strict();

export type Delta = z.infer<typeof DeltaSchema>;

/** The full envelope the LLM must produce. */
export const JardinierReplySchema = z
  .object({
    reply: z.string(),
    changes: DeltaSchema,
  })
  .strict();

export type JardinierReply = z.infer<typeof JardinierReplySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

export function clampPetales(n: number): number {
  if (Number.isNaN(n)) return PETALES_MIN;
  return Math.max(PETALES_MIN, Math.min(PETALES_MAX, Math.round(n)));
}

/**
 * Resolve a petales delta (absolute number, or relative "+n"/"-n" string)
 * against the current value, then clamp into [3, 12]. Clamping lives HERE,
 * in code — never trusted to the LLM.
 */
export function resolvePetales(
  current: number,
  delta: number | string | undefined,
): number {
  if (delta === undefined) return clampPetales(current);
  if (typeof delta === "number") return clampPetales(delta);
  // Relative string "+2" / "-1".
  const match = /^([+-])(\d+)$/.exec(delta.trim());
  if (!match) return clampPetales(current);
  const sign = match[1] === "-" ? -1 : 1;
  const amount = parseInt(match[2], 10);
  return clampPetales(current + sign * amount);
}

/**
 * Apply a validated delta onto a genome, returning a NEW genome. All clamping
 * and validation is enforced here so a malformed/hostile delta can never push
 * the genome out of bounds. Fields the delta does not mention are preserved.
 */
export function applyDelta(genome: Genome, delta: Delta): Genome {
  const next: Genome = { ...genome };

  if (delta.petales !== undefined) {
    next.petales = resolvePetales(genome.petales, delta.petales);
  }
  if (delta.couleurA !== undefined && HEX_RE.test(delta.couleurA)) {
    next.couleurA = delta.couleurA.toLowerCase();
  }
  if (delta.couleurB !== undefined && HEX_RE.test(delta.couleurB)) {
    next.couleurB = delta.couleurB.toLowerCase();
  }
  if (delta.humeur !== undefined && HUMEURS.includes(delta.humeur)) {
    next.humeur = delta.humeur;
  }

  return next;
}

/**
 * Best-effort parse + validate of a raw LLM string into a JardinierReply.
 * Strips ```json fences. Returns null when nothing usable can be recovered —
 * callers then fall back gracefully (the genome must never move on bad input).
 */
export function parseJardinierReply(raw: string): JardinierReply | null {
  if (!raw) return null;
  let text = raw.trim();

  // Strip markdown code fences if the model wrapped its JSON.
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  if (fence) text = fence[1].trim();

  // Otherwise grab the first {...} block.
  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }

  const parsed = JardinierReplySchema.safeParse(json);
  if (parsed.success) return parsed.data;

  // Maybe the reply is fine but changes contained junk: salvage the reply text
  // and drop the changes so the genome stays put.
  if (
    json &&
    typeof json === "object" &&
    "reply" in json &&
    typeof (json as { reply: unknown }).reply === "string"
  ) {
    return { reply: (json as { reply: string }).reply, changes: {} };
  }

  return null;
}
