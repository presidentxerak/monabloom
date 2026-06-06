// LLM cascade. Tries providers in order until one returns a usable reply, so
// the chatbot stays smart even after one provider's free tokens run out.
//
// Order: configured key-based providers first (best quality), then a KEYLESS
// free provider (Pollinations) so the chatbot is intelligent out of the box
// with no setup. If everything fails, the caller uses the rule-based gardener.

import Anthropic from "@anthropic-ai/sdk";
import { parseJardinierReply, type Delta } from "./genome";

export interface LlmMessage { role: "user" | "assistant"; content: string }

const MAX_TOKENS = 400;

function timeoutSignal(ms = 11000): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

// ── Anthropic (Claude) via SDK ───────────────────────────────────────────────

async function tryAnthropic(system: string, messages: LlmMessage[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const res = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    max_tokens: MAX_TOKENS,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// ── OpenAI-compatible chat completions (Cerebras, Groq, OpenRouter, Mistral) ──

async function openaiCompat(
  label: string,
  baseUrl: string,
  key: string,
  model: string,
  system: string,
  messages: LlmMessage[],
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const msgs = [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
  const call = (jsonMode: boolean) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...extraHeaders },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0.8,
        messages: msgs,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: timeoutSignal(),
    });

  // JSON mode forces valid JSON on providers that support it; retry without it
  // for those that reject the parameter.
  let res = await call(true);
  if ((res.status === 400 || res.status === 422)) res = await call(false);
  if (!res.ok) throw new Error(`${label} ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${label} empty`);
  return String(text).trim();
}

// ── Google Gemini (native REST) ──────────────────────────────────────────────

async function tryGemini(system: string, messages: LlmMessage[]): Promise<string> {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)!;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.8, responseMimeType: "application/json" },
      }),
      signal: timeoutSignal(),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new Error("gemini empty");
  return String(text).trim();
}

// ── Pollinations — KEYLESS free fallback (works with no configuration) ────────

async function tryPollinations(system: string, messages: LlmMessage[]): Promise<string> {
  if (process.env.FLOWERMON_DISABLE_KEYLESS) throw new Error("keyless disabled");
  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.POLLINATIONS_MODEL || "openai",
      temperature: 0.8,
      messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    }),
    signal: timeoutSignal(9000),
  });
  if (!res.ok) throw new Error(`pollinations ${res.status}`);
  const data = await res.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content ?? (typeof data === "string" ? data : "");
  if (!text) throw new Error("pollinations empty");
  return String(text).trim();
}

// ── Provider order ───────────────────────────────────────────────────────────

interface Provider { name: string; key: () => string | undefined; gen: (s: string, m: LlmMessage[]) => Promise<string>; }

const PROVIDERS: Provider[] = [
  { name: "anthropic", key: () => process.env.ANTHROPIC_API_KEY, gen: tryAnthropic },
  { name: "cerebras", key: () => process.env.CEREBRAS_API_KEY, gen: (s, m) => openaiCompat("cerebras", "https://api.cerebras.ai/v1", process.env.CEREBRAS_API_KEY!, process.env.CEREBRAS_MODEL || "llama-3.3-70b", s, m) },
  { name: "groq", key: () => process.env.GROQ_API_KEY, gen: (s, m) => openaiCompat("groq", "https://api.groq.com/openai/v1", process.env.GROQ_API_KEY!, process.env.GROQ_MODEL || "llama-3.3-70b-versatile", s, m) },
  { name: "gemini", key: () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY, gen: tryGemini },
  { name: "openrouter", key: () => process.env.OPENROUTER_API_KEY, gen: (s, m) => openaiCompat("openrouter", "https://openrouter.ai/api/v1", process.env.OPENROUTER_API_KEY!, process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free", s, m, { "HTTP-Referer": "https://flowermon.app", "X-Title": "Flowermon" }) },
  { name: "mistral", key: () => process.env.MISTRAL_API_KEY, gen: (s, m) => openaiCompat("mistral", "https://api.mistral.ai/v1", process.env.MISTRAL_API_KEY!, process.env.MISTRAL_MODEL || "mistral-small-latest", s, m) },
  // Keyless free fallback — always attempted last so the bot works out of the box.
  { name: "pollinations", key: () => (process.env.FLOWERMON_DISABLE_KEYLESS ? undefined : "keyless"), gen: tryPollinations },
];

export interface CascadeResult { reply: string; changes: Delta; provider: string; }

/** Names of providers that are currently configured (for diagnostics). */
export function configuredProviders(): string[] {
  return PROVIDERS.filter((p) => p.key()).map((p) => p.name);
}

/** Try each configured provider until one returns a parseable reply. */
export async function generateCascade(
  system: string,
  messages: LlmMessage[],
): Promise<CascadeResult | null> {
  for (const p of PROVIDERS) {
    if (!p.key()) continue;
    try {
      const text = await p.gen(system, messages);
      const parsed = parseJardinierReply(text);
      if (parsed) return { reply: parsed.reply, changes: parsed.changes, provider: p.name };
      console.warn(`[llm] ${p.name} returned unparseable output`);
    } catch (err) {
      console.warn(`[llm] ${p.name} failed:`, (err as Error).message);
    }
  }
  return null;
}
