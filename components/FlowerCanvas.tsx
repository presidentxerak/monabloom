"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import {
  drawFlower,
  hexToRgb,
  lerpRgb,
  type DrawState,
  type RGB,
} from "@/lib/flower-engine";

/**
 * React wrapper around the p5 flower sketch, in INSTANCE mode (no p5 globals).
 * Animation state lives in closure refs and lerps toward the genome props, so
 * genome changes glide in smoothly. Cleans the instance up on unmount/hot
 * reload to avoid leaks.
 */
export default function FlowerCanvas({ genome }: { genome: Genome }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Always-fresh genome target, read each frame by the draw loop.
  const genomeRef = useRef(genome);
  genomeRef.current = genome;

  useEffect(() => {
    let instance: p5 | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let mounted = true;

    (async () => {
      const P5 = (await import("p5")).default;
      const container = containerRef.current;
      if (!mounted || !container) return;

      // Animated, displayed state (lerps toward genomeRef each frame).
      let displayedA: RGB = hexToRgb(genomeRef.current.couleurA);
      let displayedB: RGB = hexToRgb(genomeRef.current.couleurB);
      let petalesAffiches = genomeRef.current.petales;
      let phase = 0;

      const sketch = (p: p5) => {
        const measure = () => ({
          w: container.clientWidth || 600,
          h: container.clientHeight || 600,
        });

        p.setup = () => {
          const { w, h } = measure();
          p.createCanvas(w, h);
          p.frameRate(60);
        };

        p.draw = () => {
          const g = genomeRef.current;
          const targetA = hexToRgb(g.couleurA);
          const targetB = hexToRgb(g.couleurB);

          // Colour transition (~45 frames) and petal germination (~0.06/frame).
          displayedA = lerpRgb(displayedA, targetA, 0.08);
          displayedB = lerpRgb(displayedB, targetB, 0.08);
          petalesAffiches += (g.petales - petalesAffiches) * 0.06;
          phase = (phase + 0.0025) % 1;

          p.clear();
          const size = Math.min(p.width, p.height);
          p.push();
          p.translate(p.width / 2, p.height / 2);
          const state: DrawState = {
            petalesAffiches,
            couleurA: displayedA,
            couleurB: displayedB,
            phase,
            time: p.millis() / 1000,
          };
          drawFlower(p, g, state, size);
          p.pop();
        };
      };

      instance = new P5(sketch, container);

      resizeObserver = new ResizeObserver(() => {
        if (!instance) return;
        instance.resizeCanvas(
          container.clientWidth || 600,
          container.clientHeight || 600,
        );
      });
      resizeObserver.observe(container);
    })();

    return () => {
      mounted = false;
      resizeObserver?.disconnect();
      instance?.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" aria-hidden />;
}
