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
      className="sound-btn flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm text-zinc-300 backdrop-blur-sm transition hover:bg-white/10"
      style={{
        color: on ? genome.couleurA : undefined,
        borderColor: on ? `${genome.couleurA}55` : undefined,
        boxShadow: on ? `0 0 12px ${genome.couleurA}55` : undefined,
      }}
    >
      {on ? "♫" : "♪"}
    </button>
  );
}
