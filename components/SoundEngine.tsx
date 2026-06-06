"use client";

import { useEffect, useRef, useState } from "react";
import { getSoundEngine } from "@/lib/sound";
import type { Genome } from "@/lib/genome";

export default function SoundEngine({ genome }: { genome: Genome }) {
  const [on, setOn] = useState(false);
  const prevGenomeRef = useRef<Genome | null>(null);

  // Play sound effects when genome changes
  useEffect(() => {
    const prev = prevGenomeRef.current;
    if (!prev) {
      prevGenomeRef.current = genome;
      return;
    }
    const engine = getSoundEngine();
    if (genome.petales !== prev.petales) engine.playBloom();
    else if (genome.couleurA !== prev.couleurA || genome.couleurB !== prev.couleurB) {
      engine.playSparkle();
    }
    prevGenomeRef.current = genome;
  }, [genome]);

  function toggle() {
    const engine = getSoundEngine();
    engine.toggle();
    setOn(engine.enabled);
  }

  return (
    <button
      onClick={toggle}
      title={on ? "Couper la musique" : "Activer la musique"}
      aria-label={on ? "Couper la musique" : "Activer la musique"}
      className="sound-btn fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-lg backdrop-blur-sm transition hover:scale-110 hover:bg-black/80"
      style={{ boxShadow: on ? `0 0 14px ${genome.couleurA}88` : undefined }}
    >
      {on ? "♫" : "♪"}
    </button>
  );
}
