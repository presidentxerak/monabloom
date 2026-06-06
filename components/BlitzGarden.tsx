"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import { drawFlowermon, CHAR_FOOT } from "@/lib/flower3d";

export interface BlitzFlower { id: string; genome: Genome; owner: string }

/**
 * A real, orbitable 3D garden. Flowermon characters stand spaced out on a
 * grassy plane, with kawaii clouds, mountains and a sun. Drag to orbit, scroll
 * to zoom, click a character to select it (GPU colour-picking, so selection
 * works from any angle).
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
      const BASE_TILT = 0.92;
      const R = 42;            // character head radius
      const SPACING = 240;     // distance between flowers (spread out)
      let pickReq: { x: number; y: number } | null = null;
      let downX = 0, downY = 0, moved = false;

      const positions = (n: number) => {
        const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
        const rows = Math.ceil(n / cols);
        const out: { x: number; z: number }[] = [];
        for (let i = 0; i < n; i++) {
          const c = i % cols, r = Math.floor(i / cols);
          out.push({ x: (c - (cols - 1) / 2) * SPACING, z: (r - (rows - 1) / 2) * SPACING });
        }
        return out;
      };

      const sketch = (p: p5) => {
        const measure = () => ({ w: container.clientWidth || 800, h: container.clientHeight || 600 });
        p.setup = () => { const { w, h } = measure(); p.createCanvas(w, h, p.WEBGL); p.frameRate(60); p.smooth(); };

        const setMat = (r: number, g: number, b: number, spec = 50, shine = 8) => { p.fill(r, g, b); p.ambientMaterial(r, g, b); p.specularMaterial(spec); p.shininess(shine); };

        const drawDecor = () => {
          // Ground.
          p.push(); p.rotateX(Math.PI / 2); setMat(168, 208, 150, 10, 2); p.plane(3200, 3200); p.pop();
          p.push(); p.translate(0, -1, 0); p.rotateX(Math.PI / 2); setMat(180, 218, 162, 10, 2); p.circle(0, 0, 1500); p.pop();
          // Mountains (far ring, soft blue).
          for (let k = 0; k < 7; k++) {
            const a = (k / 7) * Math.PI * 2 + 0.3;
            const mx = Math.cos(a) * 1500, mz = Math.sin(a) * 1500;
            const hgt = 520 + ((k * 137) % 260);
            p.push(); p.translate(mx, -hgt / 2, mz); p.rotateZ(Math.PI); setMat(150, 158, 205, 8, 2); p.cone(380, hgt, 5, 1, true); p.pop();
            p.push(); p.translate(mx, -hgt + 30, mz); p.rotateZ(Math.PI); setMat(238, 240, 252, 8, 2); p.cone(120, 120, 5, 1, true); p.pop();
          }
          // Sun.
          p.push(); p.translate(-900, -1100, -700); setMat(255, 224, 120, 120, 30); p.sphere(160, 18, 14); p.pop();
          // Kawaii clouds (drifting, with faces).
          const clouds: [number, number, number, number][] = [[-700, -700, 200, 1], [500, -820, -300, 0.7], [0, -620, 600, 1.2], [820, -680, 360, 0.9]];
          for (let i = 0; i < clouds.length; i++) {
            const [bx, cy, cz, sc] = clouds[i];
            const cx = ((bx + t * 14 * sc + 1800) % 3600) - 1800;
            p.push(); p.translate(cx, cy, cz); p.scale(sc);
            setMat(255, 255, 255, 30, 6);
            for (const [ox, oy, rr] of [[-80, 10, 70], [0, -20, 95], [80, 10, 72], [-30, 25, 60], [40, 25, 60]] as const) {
              p.push(); p.translate(ox, oy, 0); p.sphere(rr, 16, 12); p.pop();
            }
            // face
            setMat(60, 60, 75, 10, 4);
            p.push(); p.translate(-32, -8, 92); p.sphere(9, 8, 6); p.pop();
            p.push(); p.translate(32, -8, 92); p.sphere(9, 8, 6); p.pop();
            for (const mx of [-18, 0, 18]) { p.push(); p.translate(mx, 22, 92); p.sphere(6, 8, 6); p.pop(); }
            p.push(); p.translate(-60, 18, 86); setMat(255, 175, 195, 10, 4); p.sphere(12, 8, 6); p.pop();
            p.push(); p.translate(60, 18, 86); setMat(255, 175, 195, 10, 4); p.sphere(12, 8, 6); p.pop();
            p.pop();
          }
        };

        const idColor = (i: number): [number, number, number] => [Math.min(255, i * 14), 0, 0];

        const renderCharacters = (pick: boolean, list: BlitzFlower[], pos: { x: number; z: number }[]) => {
          for (let i = 0; i < list.length; i++) {
            p.push();
            p.translate(pos[i].x, -CHAR_FOOT * R, pos[i].z);
            if (pick) {
              const [cr, cg, cb] = idColor(i + 1);
              p.push(); p.noStroke(); p.fill(cr, cg, cb); p.translate(0, CHAR_FOOT * R * 0.5, 0); p.sphere(R * 2.7, 12, 10); p.pop();
            } else {
              // selection halo
              if (list[i].id === selRef.current) { p.push(); p.translate(0, CHAR_FOOT * R, 0); p.rotateX(Math.PI / 2); setMat(255, 236, 150, 120, 30); p.torus(R * 1.9, R * 0.12, 24, 8); p.pop(); }
              drawFlowermon(p, list[i].genome, R, t + i);
            }
            p.pop();
          }
        };

        p.draw = () => {
          t += 0.016;
          const list = flowersRef.current.slice(0, 12);
          const pos = positions(list.length);

          p.orbitControl(2.5, 2.5, 0.25);

          // Pick pass (flat colours), read the pixel, then draw the real scene.
          if (pickReq) {
            p.background(0, 0, 0);
            p.push(); p.rotateX(BASE_TILT); renderCharacters(true, list, pos); p.pop();
            const c = p.get(Math.floor(pickReq.x), Math.floor(pickReq.y)) as number[];
            const id = Math.round((c?.[0] ?? 0) / 14);
            if (id >= 1 && id <= list.length) onSelRef.current(list[id - 1].id);
            pickReq = null;
          }

          p.background(214, 233, 252);
          p.ambientLight(165, 165, 172);
          p.directionalLight(160, 160, 168, -0.4, -0.7, -0.5);
          p.pointLight(120, 120, 130, -400, -700, 500);
          p.noStroke();
          p.push();
          p.rotateX(BASE_TILT);
          drawDecor();
          renderCharacters(false, list, pos);
          p.pop();
        };

        const inCanvas = (x: number, y: number) => x >= 0 && x <= p.width && y >= 0 && y <= p.height;
        p.mousePressed = () => { downX = p.mouseX; downY = p.mouseY; moved = false; };
        p.mouseDragged = () => { if (Math.hypot(p.mouseX - downX, p.mouseY - downY) > 6) moved = true; };
        p.mouseReleased = () => { if (!moved && inCanvas(downX, downY)) pickReq = { x: downX, y: downY }; };
      };

      instance = new P5(sketch, container);
      ro = new ResizeObserver(() => { if (!instance) return; instance.resizeCanvas(container.clientWidth || 800, container.clientHeight || 600); });
      ro.observe(container);
    })();

    return () => { mounted = false; ro?.disconnect(); instance?.remove(); };
  }, []);

  return <div ref={containerRef} className="h-full w-full touch-none" aria-hidden />;
}
