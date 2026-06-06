"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AsciiFace from "@/components/AsciiFace";
import Chat from "@/components/Chat";
import FlowerCanvas from "@/components/FlowerCanvas";
import SoundEngine from "@/components/SoundEngine";
import FeedBar from "@/components/FeedBar";
import { genomeDefaut, type Genome } from "@/lib/genome";
import { feedFlower, FEED_ACTIONS, type FeedAction } from "@/lib/actions";
import { getSoundEngine } from "@/lib/sound";

export default function Home() {
  const [genome, setGenome] = useState<Genome>(() => genomeDefaut());
  const [feedNote, setFeedNote] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bloom-a", genome.couleurA);
    root.style.setProperty("--bloom-b", genome.couleurB);
  }, [genome.couleurA, genome.couleurB]);

  function handleFeed(action: FeedAction) {
    setGenome((g) => feedFlower(g, action));
    const meta = FEED_ACTIONS.find((a) => a.id === action);
    if (meta) {
      setFeedNote(meta.reply);
      setTimeout(() => setFeedNote(null), 2600);
    }
    const engine = getSoundEngine();
    if (action === "eau" || action === "pouvoir") engine.playBloom();
    else engine.playSparkle();
  }

  return (
    <main className="relative flex min-h-screen flex-col gap-3 p-3 lg:h-screen lg:flex-row lg:overflow-hidden lg:gap-4 lg:p-4">
      {/* Flower stage */}
      <section className="relative flex min-h-[55vh] flex-1 flex-col items-center justify-center lg:min-h-0">
        <div className="bloom-aura pointer-events-none absolute inset-0" />

        {/* Brand + Garden link */}
        <header className="absolute left-2 top-2 z-10 flex items-center gap-3">
          <h1 className="neon-title font-display text-lg tracking-[0.3em]">
            FLOWERMON
          </h1>
          <Link
            href="/garden"
            className="garden-link flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition"
          >
            <span>🌿</span>
            <span>The Garden</span>
          </Link>
        </header>

        {/* Sound toggle (top-right of the stage, clear of the chat) */}
        <div className="absolute right-2 top-2 z-10">
          <SoundEngine genome={genome} />
        </div>

        {/* The flower */}
        <div className="relative aspect-square w-full max-w-[600px]">
          <FlowerCanvas genome={genome} />
          <AsciiFace genome={genome} />
        </div>

        {/* Care actions + ephemeral note */}
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
          {feedNote && (
            <span
              className="rounded-full bg-black/60 px-3 py-1 text-xs backdrop-blur-sm"
              style={{ color: genome.couleurA }}
            >
              {feedNote}
            </span>
          )}
          <FeedBar genome={genome} onFeed={handleFeed} />
        </div>
      </section>

      {/* Dialogue */}
      <section className="flex h-[42vh] w-full flex-col lg:h-auto lg:w-[380px]">
        <Chat genome={genome} onGenome={setGenome} />
      </section>
    </main>
  );
}
