"use client";

import { useEffect, useState } from "react";
import AsciiFace from "@/components/AsciiFace";
import Chat from "@/components/Chat";
import FlowerCanvas from "@/components/FlowerCanvas";
import { genomeDefaut, type Genome } from "@/lib/genome";

export default function Home() {
  const [genome, setGenome] = useState<Genome>(() => genomeDefaut());

  // Keep the live CSS bloom variables in sync with the flower's colours so the
  // chat borders and titles breathe with it.
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
        <h1 className="neon-title absolute left-1 top-1 font-display text-xl tracking-widest">
          MONABLOOM
        </h1>
        <div className="relative aspect-square w-full max-w-[640px]">
          <FlowerCanvas genome={genome} />
          <AsciiFace genome={genome} />
        </div>
      </section>

      {/* Dialogue */}
      <section className="flex h-[40vh] w-full flex-col lg:h-auto lg:w-[380px]">
        <Chat genome={genome} onGenome={setGenome} />
      </section>
    </main>
  );
}
