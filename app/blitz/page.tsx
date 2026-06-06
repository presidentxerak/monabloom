"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BlitzGarden, { type BlitzFlower } from "@/components/BlitzGarden";
import FlowerPreview from "@/components/FlowerPreview";
import RarityBadge from "@/components/RarityBadge";
import { PLAYER_FLOWERS } from "@/lib/fake-players";
import { loadCollection, addOwnedGenome } from "@/lib/collection";
import { computeRarity } from "@/lib/rarity";
import { tokenLabel, rank } from "@/lib/identity";
import { nomPoetique } from "@/lib/flower-random";
import { fetchChat, sendChat, type ChatMsg } from "@/lib/social";

export default function BlitzGardenPage() {
  const [flowers, setFlowers] = useState<BlitzFlower[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const owned = loadCollection()
      .filter((f) => f.owned)
      .map((f) => ({ id: f.id, genome: f.genome, owner: f.owner ?? "you" }));
    const players = PLAYER_FLOWERS.map((f) => ({ id: f.id, genome: f.genome, owner: f.owner ?? "player" }));
    setFlowers([...owned, ...players]);

    let alive = true;
    fetchChat().then((m) => alive && setChat(m));
    const iv = setInterval(() => fetchChat().then((m) => alive && setChat(m)), 5000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const selected = useMemo(() => flowers.find((f) => f.id === selectedId) ?? null, [flowers, selectedId]);
  const selRarity = selected ? computeRarity(selected.genome) : null;

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const msgs = await sendChat(text);
    if (msgs.length) setChat(msgs);
  }

  /** Stash the flower so /play loads it, then the Link navigates there. */
  function stashView(g: BlitzFlower) {
    try { sessionStorage.setItem("fm_view", JSON.stringify(g.genome)); } catch {}
  }

  function collect(g: BlitzFlower) {
    const f = addOwnedGenome(g.genome, 0.1, g.owner);
    setNote(`Collected ${f.name} to your Cards!`);
    setTimeout(() => setNote(null), 2800);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden text-zinc-800">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-black/10 bg-white/70 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="brand-title font-display text-lg">
            FLOWER<span className="brand-dot">MON</span>
          </Link>
          <span className="rounded-full border border-black/10 bg-white/60 px-2.5 py-0.5 text-xs text-zinc-500">
            Blitz Garden
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/cards" className="pill rounded-full px-3 py-1.5">Cards</Link>
          <Link href="/play" className="btn-bump rounded-full px-3 py-1.5 font-medium">Grow a Flower</Link>
        </div>
      </nav>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 3D garden */}
        <section className="relative min-h-[52vh] flex-1">
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-white/70 px-3 py-1 text-[11px] text-zinc-500 backdrop-blur-sm">
            drag to orbit · scroll to zoom · click a flower to inspect
          </div>
          <BlitzGarden flowers={flowers} selectedId={selectedId} onSelect={setSelectedId} />
        </section>

        {/* Side panel: inspector + social chat */}
        <aside className="flex h-[42vh] w-full flex-col border-t border-black/10 bg-white/70 backdrop-blur lg:h-auto lg:w-[360px] lg:border-l lg:border-t-0">
          {/* Inspector */}
          {selected && selRarity ? (
            <div className="border-b border-black/10 p-3">
              <div className="flex items-center gap-3">
                <FlowerPreview genome={selected.genome} size={72} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-sm text-zinc-800">
                    {nomPoetique(selected.genome.seedHash)}{" "}
                    <span className="text-zinc-400">{tokenLabel(selected.genome.seedHash)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <RarityBadge rarity={selRarity} small />
                    <span className="text-[10px] text-zinc-500">Rank #{rank(selected.genome)}</span>
                    <span className="text-[10px] text-zinc-400">@{selected.owner}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href="/play"
                      onClick={() => stashView(selected)}
                      className="rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white"
                    >
                      View in 3D
                    </Link>
                    <button
                      onClick={() => collect(selected)}
                      className="btn-bump rounded-full px-3 py-1.5 text-[11px] font-medium"
                    >
                      Collect
                    </button>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] text-zinc-500 transition hover:bg-black/5"
                    >
                      Close
                    </button>
                  </div>
                  {note && <div className="mt-1 text-[10px] text-emerald-600">{note}</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-black/10 p-3 text-xs text-zinc-400">
              Click a flower in the garden to see its name, rank and rarity.
            </div>
          )}

          {/* Garden chat */}
          <div className="px-4 py-2 font-display text-sm text-zinc-700">Garden chat</div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-2" style={{ scrollbarWidth: "thin" }}>
            {chat.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-display text-[11px] text-fuchsia-500">@{m.owner}</span>{" "}
                <span className="text-zinc-700">{m.text}</span>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2 border-t border-black/10 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="say hi to the garden..."
              className="flex-1 rounded-full bg-white/80 px-4 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:bg-white"
            />
            <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
              Send
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
