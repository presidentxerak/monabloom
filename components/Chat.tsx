"use client";

import { useRef, useState } from "react";
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
    "Bonjour, petite âme. Décris-moi l'émotion ou la couleur que tu veux voir éclore… et je la ferai germer.",
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
          content: "Un silence… le jardin n'a pas répondu. Réessaie ?",
        },
      ]);
    } finally {
      setPlanting(false);
      setLoading(false);
      scrollDown();
    }
  }

  return (
    <div
      className="flex h-full flex-col rounded-2xl border bg-black/40 backdrop-blur-sm"
      style={{
        borderColor: genome.couleurB,
        boxShadow: `0 0 24px ${genome.couleurB}33`,
      }}
    >
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <span
              className="inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
              style={
                m.role === "user"
                  ? { background: `${genome.couleurB}22`, color: "#e9e3ff" }
                  : { background: "rgba(255,255,255,0.04)", color: "#d7d2e0" }
              }
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-left text-xs italic text-zinc-500">
            {planting ? "Je la plante dans la chaîne…" : "le Jardinier murmure…"}
          </div>
        )}
        {cert && (
          <div className="pt-2">
            <Certificate cert={cert} genome={genome} />
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3">
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
            placeholder="dis ton envie… ou colle ton adresse 0x…"
            disabled={loading}
            className="flex-1 rounded-full bg-white/5 px-4 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:bg-white/10"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full px-4 py-2 text-sm font-medium text-black transition disabled:opacity-40"
            style={{ background: genome.couleurA }}
          >
            ↵
          </button>
        </form>
      </div>
    </div>
  );
}
