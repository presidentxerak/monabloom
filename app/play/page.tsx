"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Chat from "@/components/Chat";
import FlowerCanvas from "@/components/FlowerCanvas";
import type { FeedSignal, PowerSignal } from "@/components/FlowerCanvas";
import SoundEngine from "@/components/SoundEngine";
import FeedBar, { type WardrobeTab } from "@/components/FeedBar";
import Wardrobe from "@/components/Wardrobe";
import MusicPlayer from "@/components/MusicPlayer";
import WalletButton from "@/components/WalletButton";
import { GenomeSchema, genomeDefaut, type Genome } from "@/lib/genome";
import { feedFlower, FEED_ACTIONS, type FeedAction } from "@/lib/actions";
import { addOwnedGenome } from "@/lib/collection";
import { DANCES, GENRE_DANCE } from "@/lib/cosmetics";
import { computeRarity } from "@/lib/rarity";
import { tokenLabel, rank } from "@/lib/identity";
import { nomPoetique } from "@/lib/flower-random";
import { hexToRgb } from "@/lib/flower-engine";
import { getSoundEngine } from "@/lib/sound";

function pastel(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v + (255 - v) * 0.84));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Play() {
  const [genome, setGenome] = useState<Genome>(() => genomeDefaut());
  const [feedNote, setFeedNote] = useState<string | null>(null);
  const [feedSignal, setFeedSignal] = useState<FeedSignal | null>(null);
  const [powerSignal, setPowerSignal] = useState<PowerSignal | null>(null);
  const [dance, setDance] = useState(0);
  const [wardrobe, setWardrobe] = useState<WardrobeTab | null>(null);
  const [music, setMusic] = useState(false);
  const [health, setHealth] = useState(70);

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

  const identity = useMemo(() => {
    const rarity = computeRarity(genome);
    return {
      name: nomPoetique(genome.seedHash),
      token: tokenLabel(genome.seedHash),
      tier: rarity.tier,
      color: rarity.color,
      rank: rank(genome),
    };
  }, [genome]);

  function note(msg: string, ms = 2600) {
    setFeedNote(msg);
    setTimeout(() => setFeedNote(null), ms);
  }

  function handleFeed(action: FeedAction) {
    setGenome((g) => feedFlower(g, action));
    setFeedSignal({ action, id: Date.now() });
    setHealth((h) => Math.min(100, h + (action === "pouvoir" ? 8 : 12)));
    const meta = FEED_ACTIONS.find((a) => a.id === action);
    if (meta) note(meta.reply);
    const engine = getSoundEngine();
    if (action === "eau" || action === "pouvoir") engine.playBloom();
    else engine.playSparkle();
  }

  function handlePower() {
    setPowerSignal({ id: Date.now() });
    setGenome((g) => feedFlower(g, "pouvoir"));
    setHealth((h) => Math.min(100, h + 8));
    getSoundEngine().playSparkle();
    note("A burst of power!");
  }

  function handleDance() {
    const next = (dance + 1) % DANCES.length;
    setDance(next);
    note(`Dance: ${DANCES[next].name}`);
  }

  function handleSave() {
    const flower = addOwnedGenome(genome);
    getSoundEngine().playSell();
    note(`Saved "${flower.name}" ${identity.token} to Cards!`, 3200);
  }

  function handleGenre(id: string) {
    const d = GENRE_DANCE[id] ?? 0;
    setDance(d);
    if (d > 0) note(`Dancing to ${id} · ${DANCES[d].name}!`);
  }

  return (
    <main className="relative flex min-h-screen flex-col gap-3 p-3 pb-[80px] sm:pb-3 lg:h-screen lg:flex-row lg:overflow-hidden lg:gap-4 lg:p-4">
      <section className="relative flex min-h-[58vh] flex-1 flex-col overflow-hidden rounded-3xl lg:min-h-0">
        {/* 3D flower behind everything */}
        <div className="absolute inset-0">
          <FlowerCanvas genome={genome} feed={feedSignal} dance={dance} power={powerSignal} />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-start justify-between gap-2 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/" className="brand-title font-display text-base sm:text-lg">
              FLOWER<span className="brand-dot">MON</span>
            </Link>
            <Link href="/cards" className="pill hidden rounded-full px-2.5 py-0.5 text-[10px] font-medium sm:inline-block sm:text-xs">Cards</Link>
            <Link href="/blitz" className="pill hidden rounded-full px-2.5 py-0.5 text-[10px] font-medium sm:inline-block sm:text-xs">Blitz</Link>
          </div>
          <div className="flex items-center gap-1.5">
            <WalletButton />
            <SoundEngine genome={genome} />
          </div>
        </div>

        {/* Identity card + health gauge */}
        <div className="relative z-10 flex justify-center px-2">
          <div className="glass flex max-w-[92%] flex-col items-center rounded-2xl px-3 py-1.5">
            <span className="truncate font-display text-xs tracking-wide text-zinc-800 sm:text-sm">
              {identity.name} <span className="text-zinc-400">{identity.token}</span>
            </span>
            <span className="text-[9px] uppercase tracking-wider sm:text-[10px]" style={{ color: identity.color }}>
              {identity.tier} · Rank #{identity.rank}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[8px] uppercase tracking-wider text-zinc-400">HP</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${health}%`, background: `linear-gradient(90deg, ${genome.couleurA}, ${genome.couleurB})` }}
                />
              </div>
              <span className="text-[8px] tabular-nums text-zinc-400">{health}</span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Feed note + action bar */}
        <div className="relative z-10 flex flex-col items-center gap-2 px-2 pb-3">
          {feedNote && (
            <span className="max-w-[90%] rounded-full bg-black/45 px-3 py-1 text-center text-[11px] text-white backdrop-blur-sm">
              {feedNote}
            </span>
          )}
          <FeedBar
            onFeed={handleFeed}
            onPower={handlePower}
            onDance={handleDance}
            onMusic={() => setMusic(true)}
            onSave={handleSave}
            onWardrobe={(tab) => setWardrobe(tab)}
          />
        </div>
      </section>

      <section className="flex h-[40vh] w-full flex-col lg:h-auto lg:w-[380px]">
        <Chat genome={genome} onGenome={setGenome} />
      </section>

      {wardrobe && (
        <Wardrobe
          genome={genome}
          initialTab={wardrobe}
          onChange={(patch) => setGenome((g) => ({ ...g, ...patch }))}
          onClose={() => setWardrobe(null)}
        />
      )}
      {music && <MusicPlayer onClose={() => setMusic(false)} onGenre={handleGenre} />}
    </main>
  );
}
