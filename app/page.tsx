"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AsciiFace from "@/components/AsciiFace";
import Chat from "@/components/Chat";
import FlowerCanvas from "@/components/FlowerCanvas";
import SoundEngine from "@/components/SoundEngine";
import { genomeDefaut, type Genome } from "@/lib/genome";

export default function Home() {
  const [genome, setGenome] = useState<Genome>(() => genomeDefaut());

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bloom-a", genome.couleurA);
    root.style.setProperty("--bloom-b", genome.couleurB);
  }, [genome.couleurA, genome.couleurB]);

  return (
    <main className="relative flex min-h-screen flex-col gap-4 p-4 lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* Flower stage */}
      <section className="relative flex min-h-[55vh] flex-1 items-center justify-center lg:min-h-0">
        <div className="bloom-aura pointer-events-none absolute inset-0" />

        {/* Title + nav */}
        <div className="absolute left-1 top-1 flex items-center gap-3">
          <h1 className="neon-title font-display text-xl tracking-widest">
            FLOWERMON
          </h1>
          <Link
            href="/marketplace"
            className="rounded-full border border-white/20 px-3 py-0.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200"
          >
            Marketplace
          </Link>
        </div>

        <div className="relative aspect-square w-full max-w-[640px]">
          <FlowerCanvas genome={genome} />
          <AsciiFace genome={genome} />
        </div>
      </section>

      {/* Dialogue */}
      <section className="flex h-[40vh] w-full flex-col lg:h-auto lg:w-[380px]">
        <Chat genome={genome} onGenome={setGenome} />
      </section>

      {/* Ambient sound toggle */}
      <SoundEngine genome={genome} />
    </main>
  );
}
