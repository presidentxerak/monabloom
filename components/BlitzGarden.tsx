"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import { hexToRgb, lerpRgb, type RGB } from "@/lib/flower-engine";

export interface BlitzFlower { id: string; genome: Genome; owner: string; }

function tint(c: RGB, t: number): RGB {
  return [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t];
}

/**
 * A scrollable 3D gallery of flower-characters. Each flower is anchored to a
 * known screen cell (so clicks are reliable), rendered with real 3D meshes that
 * gently turn and bob. Scroll to wander the garden, click a character to select.
 */
export default function BlitzGarden({
  flowers,
  selectedId,
  onSelect,
}: {
  flowers: BlitzFlower[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
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

      let scrollY = 0;
      let t = 0;

      const sketch = (p: p5) => {
        const measure = () => ({ w: container.clientWidth || 800, h: container.clientHeight || 600 });
        p.setup = () => { const { w, h } = measure(); p.createCanvas(w, h, p.WEBGL); p.frameRate(60); p.smooth(); };

        const layout = () => {
          const w = p.width;
          const cols = Math.max(2, Math.min(5, Math.floor(w / 230)));
          const cell = w / cols;
          const cellH = cell * 1.15;
          const n = flowersRef.current.length;
          const rows = Math.ceil(n / cols);
          const totalH = rows * cellH + 80;
          const maxScroll = Math.max(0, totalH - p.height);
          return { cols, cell, cellH, rows, totalH, maxScroll };
        };

        const cellCenter = (i: number, L: ReturnType<typeof layout>) => {
          const col = i % L.cols, row = Math.floor(i / L.cols);
          const cx = (col + 0.5) * L.cell;
          const cy = 70 + (row + 0.5) * L.cellH - scrollY;
          return { cx, cy };
        };

        const setMat = (c: RGB, spec = 60, shine = 12) => { p.fill(c[0], c[1], c[2]); p.ambientMaterial(c[0], c[1], c[2]); p.specularMaterial(spec); p.shininess(shine); };
        const surfZ = (R: number, x: number, y: number, out = 0) => Math.sqrt(Math.max(0, R * R - x * x - y * y)) + out;

        const drawFlower = (g: Genome, R: number, ti: number, glow: boolean) => {
          const a = hexToRgb(g.couleurA), b = hexToRgb(g.couleurB);
          const n = g.petales;
          if (glow) { p.push(); p.translate(0, R * 2.4, 0); p.rotateX(Math.PI / 2); setMat([255, 240, 160], 120, 30); p.torus(R * 1.5, R * 0.08, 24, 8); p.pop(); }
          p.push();
          p.rotateY(ti * 0.5);
          // petals
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2;
            setMat(tint(lerpRgb(a, b, i / Math.max(1, n)), 0.06), 70, 14);
            p.push(); p.rotateZ(ang); p.translate(0, -(R * 1.0 + R * 0.66), 0); p.rotateX(-0.32);
            p.ellipsoid(R * 0.28, R * 0.66, R * 0.22, 12, 8); p.pop();
          }
          // head
          setMat(tint(a, 0.5), 50, 14); p.push(); p.sphere(R, 28, 22); p.pop();
          // face
          const dark: RGB = [45, 38, 52];
          for (const sx of [-1, 1]) { const x = sx * R * 0.32, y = -R * 0.04; p.push(); p.translate(x, y, surfZ(R, x, y, R * 0.01)); setMat(dark, 15, 6); p.sphere(R * 0.09, 8, 6); p.pop(); }
          for (const sx of [-1, 1]) { const x = sx * R * 0.46, y = R * 0.14; p.push(); p.translate(x, y, surfZ(R, x, y)); setMat([255, 165, 190], 20, 6); p.ellipsoid(R * 0.12, R * 0.08, R * 0.04, 10, 6); p.pop(); }
          { const x = 0, y = R * 0.22; p.push(); p.translate(x, y, surfZ(R, x, y, R * 0.01)); setMat(dark, 15, 6); p.sphere(R * 0.05, 8, 6); p.pop(); }
          p.pop();
          // stem / body beads
          for (let k = 1; k <= 3; k++) {
            setMat(tint(k % 2 ? a : b, 0.2), 50, 12);
            p.push(); p.translate(0, R * (0.9 + k * 0.5), 0); p.sphere(R * 0.34, 14, 10); p.pop();
          }
        };

        p.draw = () => {
          t += 0.016;
          p.background(238, 234, 248);
          p.ambientLight(150, 150, 158);
          p.directionalLight(150, 150, 158, -0.4, -0.6, -0.7);
          p.pointLight(120, 120, 128, -200, -260, 360);
          p.noStroke();

          const L = layout();
          scrollY = Math.max(0, Math.min(L.maxScroll, scrollY));
          const list = flowersRef.current;
          for (let i = 0; i < list.length; i++) {
            const { cx, cy } = cellCenter(i, L);
            if (cy < -120 || cy > p.height + 160) continue; // cull offscreen
            const R = Math.min(L.cell, L.cellH) * 0.2;
            const bob = Math.sin(t * 1.6 + i) * R * 0.12;
            const glow = list[i].id === selRef.current;
            p.push();
            p.translate(cx - p.width / 2, cy - p.height / 2 - R * 1.2 + bob, 0);
            drawFlower(list[i].genome, R, t + i, glow);
            p.pop();
          }
        };

        p.mousePressed = () => {
          if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
          const L = layout();
          const list = flowersRef.current;
          let best = -1, bestD = 1e9;
          for (let i = 0; i < list.length; i++) {
            const { cx, cy } = cellCenter(i, L);
            const d = Math.hypot(p.mouseX - cx, p.mouseY - (cy - 6));
            if (d < bestD) { bestD = d; best = i; }
          }
          const R = Math.min(L.cell, L.cellH) * 0.2;
          if (best >= 0 && bestD < R * 2.4) onSelRef.current(list[best].id);
          else onSelRef.current(null);
        };

        p.mouseWheel = (e: { delta: number }) => {
          scrollY += e.delta;
          return false;
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
