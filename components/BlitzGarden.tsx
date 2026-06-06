"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import { hexToRgb, lerpRgb, type RGB } from "@/lib/flower-engine";

export interface BlitzFlower { id: string; genome: Genome; owner: string; }

function tint(c: RGB, t: number): RGB {
  return [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t];
}

interface Place { id: string; genome: Genome; sx: number; sy: number; R: number; gz: number; }

/**
 * A 3D garden: a tilted ground plane staged with flower-characters that stand
 * on it in perspective (smaller and higher toward the back). Click a flower to
 * select it. Positions are anchored to known screen points so clicks are exact.
 */
export default function BlitzGarden({
  flowers,
  selectedId,
  onSelect,
}: {
  flowers: BlitzFlower[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flowersRef = useRef(flowers); flowersRef.current = flowers;
  const selRef = useRef(selectedId); selRef.current = selectedId;
  const onSelRef = useRef(onSelect); onSelRef.current = onSelect;

  useEffect(() => {
    let instance: p5 | undefined;
    let ro: ResizeObserver | undefined;
    let mounted = true;

    (async () => {
      const P5 = (await import("p5")).default;
      const container = containerRef.current;
      if (!mounted || !container) return;

      let t = 0;
      let placements: Place[] = [];

      const sketch = (p: p5) => {
        const measure = () => ({ w: container.clientWidth || 800, h: container.clientHeight || 600 });
        p.setup = () => { const { w, h } = measure(); p.createCanvas(w, h, p.WEBGL); p.frameRate(60); p.smooth(); };

        const setMat = (c: RGB, spec = 60, shine = 12) => { p.fill(c[0], c[1], c[2]); p.ambientMaterial(c[0], c[1], c[2]); p.specularMaterial(spec); p.shininess(shine); };
        const surfZ = (R: number, x: number, y: number, out = 0) => Math.sqrt(Math.max(0, R * R - x * x - y * y)) + out;

        const computeLayout = (): Place[] => {
          const w = p.width, h = p.height;
          const list = flowersRef.current.slice(0, 24);
          const n = list.length;
          if (n === 0) return [];
          const rows = Math.max(1, Math.min(5, Math.round(Math.sqrt(n * 1.2))));
          const perRow = Math.ceil(n / rows);
          const out: Place[] = [];
          for (let i = 0; i < n; i++) {
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            const colCount = Math.min(perRow, n - row * perRow);
            const gz = rows > 1 ? row / (rows - 1) : 0.5; // 0 far .. 1 near
            const yBase = h * 0.34 + gz * (h * 0.46);
            const R = h * (0.045 + gz * 0.06);
            const spread = w * (0.28 + gz * 0.18);
            const stagger = row % 2 ? spread / Math.max(1, colCount) * 0.5 : 0;
            const x = colCount > 1 ? w / 2 + ((col / (colCount - 1)) - 0.5) * 2 * spread + stagger : w / 2 + stagger;
            const jitter = Math.sin(i * 12.9) * h * 0.012;
            out.push({ id: list[i].id, genome: list[i].genome, sx: x, sy: yBase + jitter, R, gz });
          }
          out.sort((a, b) => a.gz - b.gz); // far first
          return out;
        };

        const drawGround = () => {
          p.push();
          p.translate(0, p.height * 0.30, -320);
          p.rotateX(Math.PI / 2.5);
          setMat([196, 224, 188], 20, 4);
          p.plane(p.width * 2.8, 2400);
          p.pop();
          // a soft near strip
          p.push();
          p.translate(0, p.height * 0.42, -40);
          p.rotateX(Math.PI / 2.5);
          setMat([182, 214, 176], 20, 4);
          p.plane(p.width * 2.2, 700);
          p.pop();
        };

        const drawChar = (g: Genome, R: number, ti: number, glow: boolean) => {
          const a = hexToRgb(g.couleurA), b = hexToRgb(g.couleurB);
          const n = g.petales;
          if (glow) {
            p.push(); p.translate(0, R * 2.4, 0); p.rotateX(Math.PI / 2); setMat([255, 238, 150], 120, 30); p.torus(R * 1.6, R * 0.09, 24, 8); p.pop();
          }
          p.push();
          p.rotateY(ti * 0.5);
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2;
            setMat(tint(lerpRgb(a, b, i / Math.max(1, n)), 0.06), 70, 14);
            p.push(); p.rotateZ(ang); p.translate(0, -(R * 1.0 + R * 0.64), 0); p.rotateX(-0.32);
            p.ellipsoid(R * 0.28, R * 0.64, R * 0.22, 12, 8); p.pop();
          }
          setMat(tint(a, 0.5), 50, 14); p.push(); p.sphere(R, 26, 20); p.pop();
          const dark: RGB = [45, 38, 52];
          for (const sx of [-1, 1]) { const x = sx * R * 0.32, y = -R * 0.04; p.push(); p.translate(x, y, surfZ(R, x, y, R * 0.01)); setMat(dark, 15, 6); p.sphere(R * 0.09, 8, 6); p.pop(); }
          for (const sx of [-1, 1]) { const x = sx * R * 0.46, y = R * 0.14; p.push(); p.translate(x, y, surfZ(R, x, y)); setMat([255, 165, 190], 20, 6); p.ellipsoid(R * 0.12, R * 0.08, R * 0.04, 10, 6); p.pop(); }
          { const x = 0, y = R * 0.22; p.push(); p.translate(x, y, surfZ(R, x, y, R * 0.01)); setMat(dark, 15, 6); p.sphere(R * 0.05, 8, 6); p.pop(); }
          p.pop();
          for (let k = 1; k <= 3; k++) { setMat(tint(k % 2 ? a : b, 0.2), 50, 12); p.push(); p.translate(0, R * (0.9 + k * 0.5), 0); p.sphere(R * 0.34, 14, 10); p.pop(); }
        };

        p.draw = () => {
          t += 0.016;
          p.background(228, 238, 250); // sky
          p.ambientLight(150, 150, 158);
          p.directionalLight(150, 150, 158, -0.4, -0.7, -0.6);
          p.pointLight(120, 120, 128, -200, -300, 360);
          p.noStroke();

          drawGround();

          placements = computeLayout();
          for (const pl of placements) {
            // soft shadow on the ground
            p.push();
            p.translate(pl.sx - p.width / 2, pl.sy - p.height / 2 + pl.R * 2.35, -2);
            p.noStroke(); p.fill(70, 90, 70, 60); p.ellipse(0, 0, pl.R * 2.3, pl.R * 0.7);
            p.pop();
            // flower
            const bob = Math.sin(t * 1.6 + pl.sx) * pl.R * 0.06;
            p.push();
            p.translate(pl.sx - p.width / 2, pl.sy - p.height / 2 + bob, 0);
            drawChar(pl.genome, pl.R, t + pl.sx * 0.01, pl.id === selRef.current);
            p.pop();
          }
        };

        p.mousePressed = () => {
          // Ignore clicks outside the canvas (e.g. on the side panel).
          if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
          let best: Place | null = null, bestD = 1e9;
          for (const pl of placements) {
            const d = Math.hypot(p.mouseX - pl.sx, p.mouseY - pl.sy);
            if (d < bestD) { bestD = d; best = pl; }
          }
          // Only SELECT on a hit. Never clear the selection on a miss (so the
          // side panel and its buttons stay alive).
          if (best && bestD < best.R * 1.7) onSelRef.current(best.id);
        };
      };

      instance = new P5(sketch, container);
      ro = new ResizeObserver(() => { if (!instance) return; instance.resizeCanvas(container.clientWidth || 800, container.clientHeight || 600); });
      ro.observe(container);
    })();

    return () => { mounted = false; ro?.disconnect(); instance?.remove(); };
  }, []);

  return <div ref={containerRef} className="h-full w-full touch-none" aria-hidden />;
}
