"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Chat from "@/components/Chat";
import FlowerCanvas from "@/components/FlowerCanvas";
import type { FeedSignal, PowerSignal } from "@/components/FlowerCanvas";
import SoundEngine from "@/components/SoundEngine";
import FeedBar from "@/components/FeedBar";
import Wardrobe from "@/components/Wardrobe";
import MusicPlayer from "@/components/MusicPlayer";
import { GenomeSchema, genomeDefaut, type Genome } from "@/lib/genome";
import { feedFlower, FEED_ACTIONS, type FeedAction } from "@/lib/actions";
import { addOwnedGenome } from "@/lib/collection";
import { DANCES } from "@/lib/cosmetics";
import { hexToRgb } from "@/lib/flower-engine";
import { getSoundEngine } from "@/lib/sound";

function pastel(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v + (255 - v) * 0.84));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Home() {
  const [genome, setGenome] = useState<Genome>(() => genomeDefaut());
  const [feedNote, setFeedNote] = useState<string | null>(null);
  const [feedSignal, setFeedSignal] = useState<FeedSignal | null>(null);
  const [powerSignal, setPowerSignal] = useState<PowerSignal | null>(null);
  const [dance, setDance] = useState(0);
  const [wardrobe, setWardrobe] = useState(false);
  const [music, setMusic] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("fm_view");
      if (raw) {
        sessionStorage.removeItem("fm_view");
        const parsed = GenomeSchema.safeParse(JSON.parse(raw));
        if (parsed.success) setGenome(parsed.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bloom-a", genome.couleurA);
    root.style.setProperty("--bloom-b", genome.couleurB);
    root.style.setProperty("--bg-pastel", pastel(genome.couleurB));
  }, [genome.couleurA, genome.couleurB]);

  function note(msg: string, ms = 2600) {
    setFeedNote(msg);
    setTimeout(() => setFeedNote(null), ms);
  }

  function handleFeed(action: FeedAction) {
    setGenome((g) => feedFlower(g, action));
    setFeedSignal({ action, id: Date.now() });
    const meta = FEED_ACTIONS.find((a) => a.id === action);
    if (meta) note(meta.reply);
    const engine = getSoundEngine();
    if (action === "eau" || action === "pouvoir") engine.playBloom();
    else engine.playSparkle();
  }

  function handlePower() {
    setPowerSignal({ id: Date.now() });
    setGenome((g) => feedFlower(g, "pouvoir"));
    getSoundEngine().playSparkle();
    note("✦ A burst of power!");
  }

  function handleDance() {
    const next = (dance + 1) % DANCES.length;
    setDance(next);
    note(`Dance: ${DANCES[next].name}`);
  }

  function handleSave() {
    const flower = addOwnedGenome(genome);
    getSoundEngine().playSell();
    note(`Saved "${flower.name}" to The Garden — list it to sell!`, 3200);
  }

  return (
    <main className="relative flex min-h-screen flex-col gap-3 p-3 lg:h-screen lg:flex-row lg:overflow-hidden lg:gap-4 lg:p-4">
      {/* Flower stage */}
      <section className="relative flex min-h-[60vh] flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl lg:min-h-0">
        <header className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <h1 className="brand-title font-display text-lg">
            FLOWER<span className="brand-dot">MON</span>
          </h1>
          <Link href="/garden" className="pill rounded-full px-3 py-1 text-xs font-medium">
            The Garden
          </Link>
        </header>

        <div className="absolute right-3 top-3 z-10">
          <SoundEngine genome={genome} />
        </div>

        <div className="absolute inset-0">
          <FlowerCanvas genome={genome} feed={feedSignal} dance={dance} power={powerSignal} />
        </div>

        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
          {feedNote && (
            <span className="rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur-sm">
              {feedNote}
            </span>
          )}
          <div className="pointer-events-auto">
            <FeedBar
              onFeed={handleFeed}
              onPower={handlePower}
              onDance={handleDance}
              onDress={() => setWardrobe(true)}
              onMusic={() => setMusic(true)}
              onSave={handleSave}
            />
          </div>
        </div>
      </section>

      {/* Dialogue */}
      <section className="flex h-[40vh] w-full flex-col lg:h-auto lg:w-[380px]">
        <Chat genome={genome} onGenome={setGenome} />
      </section>

      {wardrobe && (
        <Wardrobe
          genome={genome}
          onChange={(patch) => setGenome((g) => ({ ...g, ...patch }))}
          onClose={() => setWardrobe(false)}
        />
      )}
      {music && <MusicPlayer onClose={() => setMusic(false)} />}
    </main>
  );
}
