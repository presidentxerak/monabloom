"use client";

import { useEffect, useRef, useState } from "react";
import type { Genome } from "@/lib/genome";
import Certificate, { type CertificateData } from "./Certificate";

const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hello, little soul. Tell me the emotion or the colour you'd like to see bloom… and I'll make it grow.",
};

export default function Chat({
  genome,
  onGenome,
}: {
  genome: Genome;
  onGenome: (g: Genome) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [planting, setPlanting] = useState(false);
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [ai, setAi] = useState<{ smart: boolean; keyless: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/jardinier")
      .then((r) => r.json())
      .then((d) => setAi({ smart: !!d.smart, keyless: !!d.keyless }))
      .catch(() => {});
  }, []);

  const aiLabel = ai
    ? ai.smart
      ? "✦ Smart AI on"
      : ai.keyless
        ? "✦ Free AI on"
        : "Basic mode"
    : null;

  const scrollDown = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  };

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const isAddress = ADDRESS_RE.test(text);
    if (isAddress) setPlanting(true);

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollDown();

    try {
      const res = await fetch("/api/jardinier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, genome }),
      });
      const data = await res.json();

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "…" },
      ]);
      if (data.genome) onGenome(data.genome as Genome);
      if (data.txHash) {
        setCert({
          txHash: data.txHash,
          explorerUrl: data.explorerUrl,
          blockNumber: data.blockNumber,
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "A silence… the garden didn't answer. Try again?",
        },
      ]);
    } finally {
      setPlanting(false);
      setLoading(false);
      scrollDown();
    }
  }

  return (
    <div className="glass flex h-full flex-col rounded-3xl">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {aiLabel && (
          <div className="text-center text-[10px] text-zinc-400">{aiLabel}</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className="inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
              style={
                m.role === "user"
                  ? { background: `${genome.couleurB}26`, color: "#2b2535" }
                  : { background: "rgba(255,255,255,0.7)", color: "#4a4456" }
              }
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-left text-xs italic text-zinc-500">
            {planting ? "Planting it on-chain…" : "the gardener whispers…"}
          </div>
        )}
        {cert && (
          <div className="pt-2">
            <Certificate cert={cert} genome={genome} />
          </div>
        )}
      </div>

      <div className="border-t border-black/5 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="say your wish… or paste your 0x address"
            disabled={loading}
            className="flex-1 rounded-full bg-white/70 px-4 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition disabled:opacity-40"
            style={{ background: genome.couleurA }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
