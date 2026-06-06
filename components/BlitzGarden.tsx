"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import { drawFlowermon, CHAR_FOOT } from "@/lib/flower3d";
import { mulberry32, seedFromHex } from "@/lib/prng";

export interface BlitzFlower { id: string; genome: Genome; owner: string }

const MAP_R = 15000;

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
      const EL = 0.42;           // low elevation: a front view tilted slightly down
      let az = 0.7;              // azimuth (drag to rotate)
      let dist = 2300;          // zoom
      let downX = 0, downY = 0, moved = false;
      let pickReq: { x: number; y: number } | null = null;
      let eye = { x: 0, y: -1, z: 1 };

      // Deterministic decor scatter, built once. Big world: flowers cluster in
      // the centre, decor fills the surroundings out to the map edge.
      const rng = mulberry32(seedFromHex("blitzgardenv3"));
      const PAL: [number, number, number][] = [[255, 110, 160], [255, 180, 90], [120, 200, 255], [170, 130, 255], [120, 220, 150], [255, 130, 220]];
      const scatter = (count: number, minR: number, maxR: number): Scatter[] =>
        Array.from({ length: count }, () => { const a = rng() * Math.PI * 2; const r = minR + Math.sqrt(rng()) * (maxR - minR); return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.7 + rng() * 1.1, rot: rng() * Math.PI * 2 }; });
      const trees = scatter(48, 700, 13500);
      const firs = scatter(40, 800, 14000);
      const bushes = scatter(80, 500, 13500);
      const tufts = scatter(130, 400, 14000);
      const barns = scatter(7, 2600, 12000);
      const pens = scatter(7, 2300, 11000);
      const ponds = scatter(5, 1600, 10000);
      const balloons = scatter(8, 2500, 9000);

      const flowerPos = (id: string) => {
        const s = seedFromHex(id);
        const r1 = (s % 100000) / 100000, r2 = ((s >>> 7) % 100000) / 100000;
        const a = r1 * Math.PI * 2, rad = (0.06 + Math.sqrt(r2) * 0.7) * 3000;
        return { x: Math.cos(a) * rad, z: Math.sin(a) * rad };
      };

      const sketch = (p: p5) => {
        const measure = () => ({ w: container.clientWidth || 800, h: container.clientHeight || 600 });
        p.setup = () => { const { w, h } = measure(); p.createCanvas(w, h, p.WEBGL); p.frameRate(60); p.smooth(); };

        const setMat = (r: number, g: number, b: number, a = 255, spec = 40, shine = 6) => { p.fill(r, g, b, a); p.ambientMaterial(r, g, b); p.specularMaterial(spec); p.shininess(shine); };

        // ── Decor pieces ──
        const tree = (it: Scatter) => { const s = it.s; p.push(); p.translate(it.x, 0, it.z); setMat(150, 100, 60); p.push(); p.translate(0, -42 * s, 0); p.cylinder(11 * s, 84 * s, 8, 1); p.pop(); setMat(70, 210, 100); p.push(); p.translate(0, -118 * s, 0); p.sphere(58 * s, 12, 10); p.pop(); p.push(); p.translate(-32 * s, -96 * s, 10 * s); p.sphere(40 * s, 10, 8); p.pop(); p.push(); p.translate(34 * s, -102 * s, -8 * s); p.sphere(42 * s, 10, 8); p.pop(); p.pop(); };
        const fir = (it: Scatter) => { const s = it.s; p.push(); p.translate(it.x, 0, it.z); setMat(150, 100, 60); p.push(); p.translate(0, -30 * s, 0); p.cylinder(9 * s, 62 * s, 8, 1); p.pop(); setMat(40, 185, 105); for (let k = 0; k < 3; k++) { const yy = -72 * s - k * 56 * s; const rr = (74 - k * 22) * s; p.push(); p.translate(0, yy, 0); p.rotateZ(Math.PI); p.cone(rr, 86 * s, 8, 1, true); p.pop(); } p.pop(); };
        const bush = (it: Scatter) => { const s = it.s; p.push(); p.translate(it.x, 0, it.z); setMat(86, 215, 116); p.push(); p.translate(0, -24 * s, 0); p.sphere(32 * s, 10, 8); p.pop(); p.push(); p.translate(-28 * s, -16 * s, 6 * s); p.sphere(24 * s, 8, 6); p.pop(); p.push(); p.translate(28 * s, -16 * s, -6 * s); p.sphere(26 * s, 8, 6); p.pop(); p.pop(); };
        const barn = (it: Scatter) => { p.push(); p.translate(it.x, 0, it.z); p.rotateY(it.rot); setMat(192, 74, 74); p.push(); p.translate(0, -74, 0); p.box(230, 150, 170); p.pop(); setMat(152, 52, 52); p.push(); p.translate(0, -168, 0); p.rotateZ(Math.PI / 4); p.box(150, 150, 178); p.pop(); setMat(118, 40, 40); p.push(); p.translate(0, -42, 87); p.box(64, 84, 8); p.pop(); p.pop(); };
        const sheep = (lx: number, lz: number) => { p.push(); p.translate(lx, 0, lz); setMat(242, 242, 247); p.push(); p.translate(0, -42, 0); p.sphere(34, 12, 10); p.pop(); p.push(); p.translate(-26, -46, 0); p.sphere(20, 10, 8); p.pop(); setMat(44, 44, 52); p.push(); p.translate(40, -48, 0); p.sphere(16, 10, 8); p.pop(); for (const a of [-18, 18]) for (const b of [-14, 14]) { p.push(); p.translate(a, -14, b); p.cylinder(5, 30, 6, 1); p.pop(); } p.pop(); };
        const pen = (it: Scatter) => { p.push(); p.translate(it.x, 0, it.z); p.rotateY(it.rot); setMat(156, 124, 92); const hf = 190; for (const [ax, az2, w, d] of [[0, -hf, 2 * hf, 14], [0, hf, 2 * hf, 14], [-hf, 0, 14, 2 * hf], [hf, 0, 14, 2 * hf]] as const) { p.push(); p.translate(ax, -34, az2); p.box(w, 68, d); p.pop(); } sheep(60, -40); sheep(-60, 50); sheep(10, 90); p.pop(); };
        const pond = (it: Scatter) => { p.push(); p.translate(it.x, -2, it.z); p.rotateX(Math.PI / 2); setMat(126, 186, 238, 255, 60, 20); p.circle(0, 0, 520 * it.s); setMat(170, 210, 245, 255, 60, 20); p.circle(0, 0, 320 * it.s); p.pop(); };
        const tuft = (it: Scatter) => { const s = it.s; p.push(); p.translate(it.x, 0, it.z); setMat(96, 200, 110); for (const [ox, h] of [[-10, 34], [4, 46], [16, 30]] as const) { p.push(); p.translate(ox * s, -h * s * 0.5, 0); p.rotateZ(Math.PI); p.cone(6 * s, h * s, 5, 1, true); p.pop(); } p.pop(); };
        const balloon = (it: Scatter, i: number) => { const s = it.s; const c = PAL[i % PAL.length]; const drift = Math.sin(t * 0.3 + i) * 120; p.push(); p.translate(it.x + drift, -1600 - s * 600, it.z); setMat(c[0], c[1], c[2], 255, 80, 20); p.push(); p.scale(1, 1.15, 1); p.sphere(180 * s, 16, 14); p.pop(); setMat(150, 110, 70); p.push(); p.translate(0, 250 * s, 0); p.box(70 * s, 70 * s, 70 * s); p.pop(); setMat(120, 120, 120); for (const sx of [-1, 1]) { p.push(); p.translate(sx * 90 * s, 150 * s, 0); p.box(4, 200 * s, 4); p.pop(); } p.pop(); };
        const rainbow = () => { const cols: [number, number, number][] = [[255, 96, 96], [255, 162, 64], [255, 232, 96], [112, 212, 112], [92, 172, 255], [124, 112, 242], [184, 112, 232]]; p.push(); p.translate(-6000, 0, -8000); for (let k = 0; k < 7; k++) { setMat(cols[k][0], cols[k][1], cols[k][2], 255, 60, 20); p.push(); p.torus(2600 - k * 150, 70, 28, 8); p.pop(); } p.pop(); };

        const near = (it: Scatter) => { const dx = it.x - eye.x, dz = it.z - eye.z; return dx * dx + dz * dz < 11000 * 11000; };

        const drawDecor = () => {
          // Ground (vivid grass).
          p.push(); p.rotateX(Math.PI / 2); setMat(120, 206, 112, 255, 8, 2); p.plane(MAP_R * 3, MAP_R * 3); p.pop();
          p.push(); p.translate(0, -1, 0); p.rotateX(Math.PI / 2); setMat(138, 220, 126, 255, 8, 2); p.circle(0, 0, MAP_R * 2.1); p.pop();
          // Sun + mountains far away.
          p.push(); p.translate(-9000, -9000, -10000); setMat(255, 226, 120, 255, 120, 30); p.sphere(1400, 18, 14); p.pop();
          for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2 + 0.2; const mx = Math.cos(a) * MAP_R * 0.95, mz = Math.sin(a) * MAP_R * 0.95; const hgt = 3200 + ((k * 521) % 1800); p.push(); p.translate(mx, -hgt / 2, mz); p.rotateZ(Math.PI); setMat(150, 158, 205, 255, 8, 2); p.cone(2200, hgt, 5, 1, true); p.pop(); p.push(); p.translate(mx, -hgt + 200, mz); p.rotateZ(Math.PI); setMat(240, 242, 252, 255, 8, 2); p.cone(700, 700, 5, 1, true); p.pop(); }
          rainbow();
          const clouds: [number, number, number, number][] = [[-6000, -4200, 3000, 2.4], [4000, -5000, -3500, 1.8], [0, -3800, 7000, 2.8], [8000, -4600, 3500, 2.0], [-3000, -5400, -6000, 2.2]];
          for (const [bx, cy, cz, sc] of clouds) { const cx = ((bx + t * 40 * sc + MAP_R * 2) % (MAP_R * 4)) - MAP_R * 2; p.push(); p.translate(cx, cy, cz); p.scale(sc * 5); setMat(255, 255, 255, 255, 30, 6); for (const [ox, oy, rr] of [[-80, 10, 70], [0, -20, 95], [80, 10, 72], [-30, 25, 60], [40, 25, 60]] as const) { p.push(); p.translate(ox, oy, 0); p.sphere(rr, 12, 10); p.pop(); } setMat(60, 60, 75, 255, 10, 4); p.push(); p.translate(-32, -8, 92); p.sphere(9, 8, 6); p.pop(); p.push(); p.translate(32, -8, 92); p.sphere(9, 8, 6); p.pop(); for (const mx of [-18, 0, 18]) { p.push(); p.translate(mx, 22, 92); p.sphere(6, 8, 6); p.pop(); } setMat(255, 175, 195, 255, 10, 4); p.push(); p.translate(-60, 18, 86); p.sphere(12, 8, 6); p.pop(); p.push(); p.translate(60, 18, 86); p.sphere(12, 8, 6); p.pop(); p.pop(); }
          balloons.forEach((b, i) => balloon(b, i));
          // Ground props (culled when far from the camera).
          for (const it of ponds) if (near(it)) pond(it);
          for (const it of tufts) if (near(it)) tuft(it);
          for (const it of bushes) if (near(it)) bush(it);
          for (const it of trees) if (near(it)) tree(it);
          for (const it of firs) if (near(it)) fir(it);
          for (const it of barns) if (near(it)) barn(it);
          for (const it of pens) if (near(it)) pen(it);
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
          // up = (0,1,0): keeps the world right-side up (heads up, sky up).
          p.camera(eye.x, eye.y, eye.z, cx, cy, cz, 0, 1, 0);
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

          p.background(138, 196, 244);
          p.ambientLight(148, 148, 156);
          p.directionalLight(164, 164, 172, -0.4, -0.7, -0.5);
          p.pointLight(108, 108, 120, -6000, -9000, 6000);
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
