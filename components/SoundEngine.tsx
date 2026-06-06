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
      title={on ? "Mute music" : "Play music"}
      aria-label={on ? "Mute music" : "Play music"}
      className="sound-btn flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-md transition hover:bg-white/15"
      style={{ color: on ? genome.couleurA : undefined }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V6l10-2v12" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
        {!on && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}
