"use client";

import { useEffect, useRef, useState } from "react";
import type { Genome } from "@/lib/genome";
import { HUMEUR_META } from "@/lib/humeur";

/**
 * Monospace ASCII face centred inside the flower's core. Pure UI (not part of
 * the genome): it blinks on a 3–5s interval, tints itself with the bloom colour,
 * and scales to the core size so the eyes/mouth always sit inside the heart.
 */
export default function AsciiFace({ genome }: { genome: Genome }) {
  const meta = HUMEUR_META[genome.humeur];
  const [blinking, setBlinking] = useState(false);
  const [fontSize, setFontSize] = useState(22);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  // Blink loop.
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
        }, 150);
      }, wait);
    };
    loop();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Keep the face sized to the core (~4% of the stage width).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || 600;
      setFontSize(Math.max(13, w * 0.04));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const face = blinking ? meta.blink : meta.open;

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      aria-label={`Visage de la fleur : humeur ${genome.humeur}`}
    >
      <span
        className="font-mono leading-none"
        style={{
          fontSize: `${fontSize}px`,
          color: genome.couleurA,
          textShadow: `0 0 6px ${genome.couleurA}, 0 0 14px ${genome.couleurB}`,
          transition: "color 0.6s ease, font-size 0.2s ease",
        }}
      >
        {face}
      </span>
    </div>
  );
}
