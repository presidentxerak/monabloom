"use client";

import { useEffect, useRef, useState } from "react";
import type { Genome } from "@/lib/genome";
import { HUMEUR_META } from "@/lib/humeur";

/**
 * Monospace ASCII face layered over the flower's core. Pure UI (not part of the
 * genome): it blinks on a 3–5s interval and tints itself with the bloom colour.
 */
export default function AsciiFace({ genome }: { genome: Genome }) {
  const meta = HUMEUR_META[genome.humeur];
  const [blinking, setBlinking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const loop = () => {
      const wait = 3000 + Math.random() * 2000; // 3–5 s
      timer.current = setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        setTimeout(() => {
          if (cancelled) return;
          setBlinking(false);
          loop();
        }, 150); // 150 ms eyes-closed
      }, wait);
    };
    loop();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const face = blinking ? meta.blink : meta.open;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      aria-label={`Visage de la fleur : humeur ${genome.humeur}`}
    >
      <span
        className="font-mono"
        style={{
          fontSize: "28px",
          color: genome.couleurA,
          textShadow: `0 0 8px ${genome.couleurA}, 0 0 18px ${genome.couleurB}`,
          transition: "color 0.6s ease",
        }}
      >
        {face}
      </span>
    </div>
  );
}
