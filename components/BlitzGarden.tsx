"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import { drawFlowermon, CHAR_FOOT } from "@/lib/flower3d";
import { mulberry32, seedFromHex } from "@/lib/prng";

export interface BlitzFlower { id: string; genome: Genome; owner: string }

const MAP_R = 3000;

interface Scatter { x: number; z: number; s: number; rot: number }

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
      const R = 72;
      const EL = 0.9;            // fixed 3/4 elevation (camera never goes under the map)
      let az = 0.7;              // azimuth (drag to rotate)
      let dist = 2100;          // zoom
      let downX = 0, downY = 0, moved = false;
      let pickReq: { x: number; y: number } | null = null;
      let eye = { x: 0, y: -1, z: 1 };

      // Deterministic decor scatter, built once.
      const rng = mulberry32(seedFromHex("blitzgardenv2"));
      const scatter = (count: number, minR: number, maxR: number): Scatter[] =>
        Array.from({ length: count }, () => { const a = rng() * Math.PI * 2; const r = minR + Math.sqrt(rng()) * (maxR - minR); return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.7 + rng() * 0.9, rot: rng() * Math.PI * 2 }; });
      const trees = scatter(20, 350, 2900);
      const firs = scatter(16, 450, 2950);
      const bushes = scatter(30, 220, 2900);
      const barns = scatter(3, 1300, 2600);
      const pens = scatter(3, 1100, 2500);
      const ponds = scatter(2, 800, 2300);

      const flowerPos = (id: string) => {
        const s = seedFromHex(id);
        const r1 = (s % 100000) / 100000, r2 = ((s >>> 7) % 100000) / 100000;
        const a = r1 * Math.PI * 2, rad = (0.08 + Math.sqrt(r2) * 0.72) * 2600;
        return { x: Math.cos(a) * rad, z: Math.sin(a) * rad };
      };

      const sketch = (p: p5) => {
        const measure = () => ({ w: container.clientWidth || 800, h: container.clientHeight || 600 });
        p.setup = () => { const { w, h } = measure(); p.createCanvas(w, h, p.WEBGL); p.frameRate(60); p.smooth(); };

        const setMat = (r: number, g: number, b: number, a = 255, spec = 40, shine = 6) => { p.fill(r, g, b, a); p.ambientMaterial(r, g, b); p.specularMaterial(spec); p.shininess(shine); };

        // ── Decor pieces ──
        const tree = (it: Scatter) => { const s = it.s; p.push(); p.translate(it.x, 0, it.z); setMat(122, 86, 54); p.push(); p.translate(0, -42 * s, 0); p.cylinder(11 * s, 84 * s, 8, 1); p.pop(); setMat(88, 172, 100); p.push(); p.translate(0, -118 * s, 0); p.sphere(58 * s, 12, 10); p.pop(); p.push(); p.translate(-32 * s, -96 * s, 10 * s); p.sphere(40 * s, 10, 8); p.pop(); p.push(); p.translate(34 * s, -102 * s, -8 * s); p.sphere(42 * s, 10, 8); p.pop(); p.pop(); };
        const fir = (it: Scatter) => { const s = it.s; p.push(); p.translate(it.x, 0, it.z); setMat(120, 86, 54); p.push(); p.translate(0, -30 * s, 0); p.cylinder(9 * s, 62 * s, 8, 1); p.pop(); setMat(58, 148, 92); for (let k = 0; k < 3; k++) { const yy = -72 * s - k * 56 * s; const rr = (74 - k * 22) * s; p.push(); p.translate(0, yy, 0); p.rotateZ(Math.PI); p.cone(rr, 86 * s, 8, 1, true); p.pop(); } p.pop(); };
        const bush = (it: Scatter) => { const s = it.s; p.push(); p.translate(it.x, 0, it.z); setMat(98, 178, 108); p.push(); p.translate(0, -24 * s, 0); p.sphere(32 * s, 10, 8); p.pop(); p.push(); p.translate(-28 * s, -16 * s, 6 * s); p.sphere(24 * s, 8, 6); p.pop(); p.push(); p.translate(28 * s, -16 * s, -6 * s); p.sphere(26 * s, 8, 6); p.pop(); p.pop(); };
        const barn = (it: Scatter) => { p.push(); p.translate(it.x, 0, it.z); p.rotateY(it.rot); setMat(192, 74, 74); p.push(); p.translate(0, -74, 0); p.box(230, 150, 170); p.pop(); setMat(152, 52, 52); p.push(); p.translate(0, -168, 0); p.rotateZ(Math.PI / 4); p.box(150, 150, 178); p.pop(); setMat(118, 40, 40); p.push(); p.translate(0, -42, 87); p.box(64, 84, 8); p.pop(); p.pop(); };
        const sheep = (lx: number, lz: number) => { p.push(); p.translate(lx, 0, lz); setMat(242, 242, 247); p.push(); p.translate(0, -42, 0); p.sphere(34, 12, 10); p.pop(); p.push(); p.translate(-26, -46, 0); p.sphere(20, 10, 8); p.pop(); setMat(44, 44, 52); p.push(); p.translate(40, -48, 0); p.sphere(16, 10, 8); p.pop(); for (const a of [-18, 18]) for (const b of [-14, 14]) { p.push(); p.translate(a, -14, b); p.cylinder(5, 30, 6, 1); p.pop(); } p.pop(); };
        const pen = (it: Scatter) => { p.push(); p.translate(it.x, 0, it.z); p.rotateY(it.rot); setMat(156, 124, 92); const hf = 190; for (const [ax, az2, w, d] of [[0, -hf, 2 * hf, 14], [0, hf, 2 * hf, 14], [-hf, 0, 14, 2 * hf], [hf, 0, 14, 2 * hf]] as const) { p.push(); p.translate(ax, -34, az2); p.box(w, 68, d); p.pop(); } sheep(60, -40); sheep(-60, 50); sheep(10, 90); p.pop(); };
        const pond = (it: Scatter) => { p.push(); p.translate(it.x, -2, it.z); p.rotateX(Math.PI / 2); setMat(126, 186, 238, 255, 60, 20); p.circle(0, 0, 380 * it.s); setMat(170, 210, 245, 255, 60, 20); p.circle(0, 0, 240 * it.s); p.pop(); };
        const rainbow = () => { const cols: [number, number, number][] = [[255, 96, 96], [255, 162, 64], [255, 232, 96], [112, 212, 112], [92, 172, 255], [124, 112, 242], [184, 112, 232]]; p.push(); p.translate(-1600, 0, -2200); for (let k = 0; k < 7; k++) { setMat(cols[k][0], cols[k][1], cols[k][2], 255, 60, 20); p.push(); p.torus(660 - k * 44, 20, 26, 8); p.pop(); } p.pop(); };

        const drawDecor = () => {
          // Ground.
          p.push(); p.rotateX(Math.PI / 2); setMat(150, 200, 138, 255, 8, 2); p.plane(MAP_R * 3, MAP_R * 3); p.pop();
          p.push(); p.translate(0, -1, 0); p.rotateX(Math.PI / 2); setMat(166, 212, 150, 255, 8, 2); p.circle(0, 0, MAP_R * 2.1); p.pop();
          // Sun + clouds + mountains far away.
          p.push(); p.translate(-2200, -2200, -2400); setMat(255, 226, 120, 255, 120, 30); p.sphere(320, 18, 14); p.pop();
          for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + 0.2; const mx = Math.cos(a) * MAP_R * 1.25, mz = Math.sin(a) * MAP_R * 1.25; const hgt = 900 + ((k * 211) % 500); p.push(); p.translate(mx, -hgt / 2, mz); p.rotateZ(Math.PI); setMat(150, 158, 205, 255, 8, 2); p.cone(700, hgt, 5, 1, true); p.pop(); p.push(); p.translate(mx, -hgt + 60, mz); p.rotateZ(Math.PI); setMat(240, 242, 252, 255, 8, 2); p.cone(230, 220, 5, 1, true); p.pop(); }
          rainbow();
          const clouds: [number, number, number, number][] = [[-1400, -1500, 600, 1.6], [900, -1700, -700, 1.2], [0, -1300, 1400, 1.9], [1700, -1500, 700, 1.4]];
          for (const [bx, cy, cz, sc] of clouds) { const cx = ((bx + t * 28 * sc + MAP_R * 2) % (MAP_R * 4)) - MAP_R * 2; p.push(); p.translate(cx, cy, cz); p.scale(sc * 2.2); setMat(255, 255, 255, 255, 30, 6); for (const [ox, oy, rr] of [[-80, 10, 70], [0, -20, 95], [80, 10, 72], [-30, 25, 60], [40, 25, 60]] as const) { p.push(); p.translate(ox, oy, 0); p.sphere(rr, 12, 10); p.pop(); } setMat(60, 60, 75, 255, 10, 4); p.push(); p.translate(-32, -8, 92); p.sphere(9, 8, 6); p.pop(); p.push(); p.translate(32, -8, 92); p.sphere(9, 8, 6); p.pop(); for (const mx of [-18, 0, 18]) { p.push(); p.translate(mx, 22, 92); p.sphere(6, 8, 6); p.pop(); } setMat(255, 175, 195, 255, 10, 4); p.push(); p.translate(-60, 18, 86); p.sphere(12, 8, 6); p.pop(); p.push(); p.translate(60, 18, 86); p.sphere(12, 8, 6); p.pop(); p.pop(); }
          // Ground props.
          ponds.forEach(pond); bushes.forEach(bush); trees.forEach(tree); firs.forEach(fir); barns.forEach(barn); pens.forEach(pen);
        };

        const idColor = (i: number): [number, number, number] => [i * 3 + 5, 0, 0];
        const decodeId = (c: number[]): number => { const r = c?.[0] ?? 0; return r < 5 ? 0 : Math.round((r - 5) / 3); };

        const renderFlowers = (pick: boolean) => {
          const list = flowersRef.current;
          for (let i = 0; i < list.length; i++) {
            const pos = flowerPos(list[i].id);
            const dx = pos.x - eye.x, dy = -CHAR_FOOT * R - eye.y, dz = pos.z - eye.z;
            const dToEye = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const lod = dToEye > 3200 ? 1 : 0;
            p.push();
            p.translate(pos.x, -CHAR_FOOT * R, pos.z);
            if (pick) {
              const [cr, cg, cb] = idColor(i + 1);
              p.push(); p.noStroke(); p.fill(cr, cg, cb); p.translate(0, CHAR_FOOT * R * 0.5, 0); p.sphere(R * 2.7, 10, 8); p.pop();
            } else {
              if (list[i].id === selRef.current) { p.push(); p.translate(0, CHAR_FOOT * R, 0); p.rotateX(Math.PI / 2); setMat(255, 236, 150, 255, 120, 30); p.torus(R * 2.0, R * 0.14, 24, 8); p.pop(); }
              const dance = seedFromHex(list[i].id + "dance") % 6;
              drawFlowermon(p, list[i].genome, R, t + i * 0.7, dance, lod);
            }
            p.pop();
          }
        };

        const applyCamera = () => {
          const w = p.width, h = p.height;
          const hr = Math.cos(EL) * dist, hh = Math.sin(EL) * dist;
          const cx = 0, cy = -240, cz = 0;
          eye = { x: cx + Math.sin(az) * hr, y: cy - hh, z: cz + Math.cos(az) * hr };
          p.perspective(Math.PI / 3.1, w / h, 20, 18000);
          p.camera(eye.x, eye.y, eye.z, cx, cy, cz, 0, -1, 0);
        };

        p.draw = () => {
          t += 0.016;
          applyCamera();

          if (pickReq) {
            p.background(0, 0, 0);
            renderFlowers(true);
            const c = p.get(Math.floor(pickReq.x), Math.floor(pickReq.y)) as number[];
            const id = decodeId(c);
            const list = flowersRef.current;
            if (id >= 1 && id <= list.length) onSelRef.current(list[id - 1].id);
            pickReq = null;
            applyCamera();
          }

          p.background(206, 230, 252);
          p.ambientLight(168, 168, 174);
          p.directionalLight(160, 160, 168, -0.4, -0.7, -0.5);
          p.pointLight(120, 120, 130, -1200, -1800, 1200);
          p.noStroke();
          drawDecor();
          renderFlowers(false);
        };

        const inCanvas = (x: number, y: number) => x >= 0 && x <= p.width && y >= 0 && y <= p.height;
        p.mousePressed = () => { downX = p.mouseX; downY = p.mouseY; moved = false; };
        p.mouseDragged = () => {
          if (!inCanvas(downX, downY)) return;
          if (Math.hypot(p.mouseX - downX, p.mouseY - downY) > 5) moved = true;
          az -= (p.mouseX - p.pmouseX) * 0.006;
        };
        p.mouseReleased = () => { if (!moved && inCanvas(downX, downY)) pickReq = { x: downX, y: downY }; };
        p.mouseWheel = (e: { delta: number }) => { dist = Math.max(900, Math.min(7000, dist + e.delta * 2)); return false; };
      };

      instance = new P5(sketch, container);
      ro = new ResizeObserver(() => { if (!instance) return; instance.resizeCanvas(container.clientWidth || 800, container.clientHeight || 600); });
      ro.observe(container);
    })();

    return () => { mounted = false; ro?.disconnect(); instance?.remove(); };
  }, []);

  return <div ref={containerRef} className="h-full w-full touch-none" aria-hidden />;
}
