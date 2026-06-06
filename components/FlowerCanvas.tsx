"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import { hexToRgb, lerpRgb, type RGB } from "@/lib/flower-engine";
import { HUMEUR_META } from "@/lib/humeur";
import { prngFromHex, seedFromHex } from "@/lib/prng";

export interface FeedSignal {
  action: "eau" | "engrais" | "soleil" | "pouvoir";
  id: number;
}

function tint(c: RGB, t: number): RGB {
  return [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): RGB {
  s = Math.min(1, Math.max(0, s)); l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function vivid(c: RGB, ds = 0.28, dl = 0): RGB {
  const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
  return hslToRgb(h, s + ds, l + dl);
}
function rotateHue(c: RGB, deg: number): RGB {
  const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
  return hslToRgb((h + deg + 360) % 360, s, l);
}

interface PetalVar { len: number; wid: number; hueShift: number; tilt: number; }
interface Projectile { action: FeedSignal["action"]; t: number; }

function petal3DStyle(seedHash: string): number {
  return seedFromHex(seedHash + "3dshape") % 7;
}

const FEED_COLOR: Record<FeedSignal["action"], RGB> = {
  eau: [90, 175, 255],
  engrais: [150, 110, 70],
  soleil: [255, 205, 70],
  pouvoir: [235, 90, 220],
};

export default function FlowerCanvas({
  genome,
  feed = null,
}: {
  genome: Genome;
  feed?: FeedSignal | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const genomeRef = useRef(genome);
  genomeRef.current = genome;
  const feedRef = useRef(feed);
  feedRef.current = feed;

  useEffect(() => {
    let instance: p5 | undefined;
    let ro: ResizeObserver | undefined;
    let mounted = true;

    (async () => {
      const P5 = (await import("p5")).default;
      const container = containerRef.current;
      if (!mounted || !container) return;

      let dispA: RGB = hexToRgb(genomeRef.current.couleurA);
      let dispB: RGB = hexToRgb(genomeRef.current.couleurB);
      let dispBg: RGB = tint(hexToRgb(genomeRef.current.couleurB), 0.82);
      let petalesShown = genomeRef.current.petales;
      let spin = 0;
      let gulp = 0;
      let lastFeedId = feedRef.current?.id ?? -1;
      const projectiles: Projectile[] = [];

      let lastSeed = "";
      let vars: PetalVar[] = [];
      let shape = 0;
      const rebuild = (seed: string) => {
        const r = prngFromHex(seed);
        const out: PetalVar[] = [];
        for (let i = 0; i < 12; i++) {
          out.push({
            len: 1 + (r() - 0.5) * 0.24,
            wid: 1 + (r() - 0.5) * 0.24,
            hueShift: (r() - 0.5) * 0.5,
            tilt: 0.16 + r() * 0.22,
          });
        }
        vars = out;
        shape = petal3DStyle(seed);
      };

      const sketch = (p: p5) => {
        const measure = () => ({
          w: container.clientWidth || 600,
          h: container.clientHeight || 600,
        });

        p.setup = () => {
          const { w, h } = measure();
          p.createCanvas(w, h, p.WEBGL);
          p.frameRate(60);
          p.smooth();
        };

        const setMat = (c: RGB, spec = 70, shine = 14) => {
          p.fill(c[0], c[1], c[2]);
          p.ambientMaterial(c[0], c[1], c[2]);
          p.specularMaterial(spec);
          p.shininess(shine);
        };

        /** z on the head's front surface for an (x,y) offset, pushed out a touch. */
        const surfZ = (R: number, x: number, y: number, out = 0) =>
          Math.sqrt(Math.max(0, R * R - x * x - y * y)) + out;

        const petalColour = (t: number, v: PetalVar): RGB =>
          tint(rotateHue(vivid(lerpRgb(dispA, dispB, t), 0.3, 0.02), v.hueShift * 40), 0.04);

        const petalShape = (w: number, h: number, t: number) => {
          switch (shape) {
            case 1:
              p.ellipsoid(w * 1.1, h * 0.95, t * 1.1, 16, 12); break;
            case 2:
              p.push(); p.rotateZ(Math.PI / 4); p.box(w * 1.4, h * 1.4, t * 1.3); p.pop(); break;
            case 3:
              p.cylinder(w * 0.72, h * 1.6, 16, 1);
              p.push(); p.translate(0, -h * 0.8, 0); p.sphere(w * 0.72, 12, 10); p.pop();
              p.push(); p.translate(0, h * 0.8, 0); p.sphere(w * 0.72, 12, 10); p.pop(); break;
            case 4:
              p.cone(w * 1.1, h * 1.9, 18, 1, true); break;
            case 5:
              p.torus(h * 0.5, w * 0.42, 22, 12); break;
            case 6:
              for (const yy of [-h * 0.65, 0, h * 0.65]) {
                p.push(); p.translate(0, yy, 0); p.sphere(w * 0.8, 12, 10); p.pop();
              }
              break;
            default:
              p.ellipsoid(w, h, t, 18, 12);
          }
        };

        const bead = (x: number, y: number, r: number, c: RGB) => {
          p.push(); p.translate(x, y, 0); setMat(c); p.sphere(r, 16, 12); p.pop();
        };

        // Chibi bead body (short + stout).
        const drawBody = (R: number, cMain: RGB, cAlt: RGB, cShoe: RGB, cSole: RGB) => {
          bead(0, R * 1.0, R * 0.3, cAlt);
          bead(0, R * 1.55, R * 0.62, cMain);
          bead(0, R * 2.15, R * 0.6, cMain);
          for (const sx of [-1, 1]) {
            bead(sx * R * 0.44, R * 1.85, R * 0.4, cAlt);
            bead(sx * R * 0.62, R * 1.55, R * 0.42, cMain);
            bead(sx * R * 0.92, R * 1.8, R * 0.32, cAlt);
            bead(sx * R * 1.0, R * 2.15, R * 0.28, cMain);
            bead(sx * R * 0.96, R * 2.45, R * 0.28, cAlt);
            bead(sx * R * 0.3, R * 2.55, R * 0.46, cMain);
            bead(sx * R * 0.32, R * 3.0, R * 0.38, cMain);
            bead(sx * R * 0.34, R * 3.35, R * 0.3, cAlt);
            p.push(); p.translate(sx * R * 0.34, R * 3.55, R * 0.16); setMat(cShoe); p.ellipsoid(R * 0.5, R * 0.3, R * 0.62, 16, 12); p.pop();
            p.push(); p.translate(sx * R * 0.34, R * 3.74, R * 0.16); setMat(cSole); p.ellipsoid(R * 0.52, R * 0.13, R * 0.64, 16, 12); p.pop();
          }
        };

        const drawFace = (R: number, mood: string) => {
          const dark: RGB = [45, 38, 52];
          const blush: RGB = [255, 160, 185];
          const nose: RGB = [255, 150, 175];

          // Eyes — curved closed lids made of a few bigger dark spheres.
          for (const sx of [-1, 1]) {
            for (const [ox, oy] of [[-0.1, 0.0], [0.0, -0.03], [0.1, 0.0]] as const) {
              const x = sx * R * 0.32 + ox * R;
              const y = -R * 0.04 + oy * R;
              p.push();
              p.translate(x, y, surfZ(R, x, y, R * 0.01));
              setMat(dark, 15, 6);
              p.sphere(R * 0.055, 10, 8);
              p.pop();
            }
          }
          // Blush.
          for (const sx of [-1, 1]) {
            const x = sx * R * 0.5, y = R * 0.14;
            p.push();
            p.translate(x, y, surfZ(R, x, y));
            setMat(blush, 25, 6);
            p.ellipsoid(R * 0.14, R * 0.09, R * 0.05, 14, 8);
            p.pop();
          }
          // Nose.
          {
            const x = 0, y = R * 0.04;
            p.push();
            p.translate(x, y, surfZ(R, x, y, R * 0.02));
            setMat(nose, 40, 12);
            p.sphere(R * 0.05, 12, 10);
            p.pop();
          }
          // Mouth — clear, mood-driven.
          const mouth: [number, number, number][] = [];
          const add = (x: number, y: number, r: number) => mouth.push([x, y, r]);
          if (mood === "joyeuse") {
            for (let k = -3; k <= 3; k++) add(k * R * 0.05, R * 0.2 + Math.abs(k) * R * 0.028, R * 0.04);
          } else if (mood === "espiegle") {
            add(-R * 0.09, R * 0.2, R * 0.045); add(-R * 0.03, R * 0.24, R * 0.045);
            add(R * 0.03, R * 0.24, R * 0.045); add(R * 0.09, R * 0.2, R * 0.045);
          } else if (mood === "melancolique") {
            for (let k = -2; k <= 2; k++) add(k * R * 0.055, R * 0.26 - Math.abs(k) * R * 0.025, R * 0.04);
          } else {
            for (let k = -2; k <= 2; k++) add(k * R * 0.05, R * 0.21 + Math.abs(k) * R * 0.02, R * 0.04);
          }
          for (const [mx, my, mr] of mouth) {
            p.push();
            p.translate(mx, my, surfZ(R, mx, my, R * 0.01));
            setMat(dark, 15, 6);
            p.sphere(mr, 10, 8);
            p.pop();
          }
        };

        p.draw = () => {
          const g = genomeRef.current;
          if (g.seedHash !== lastSeed) { lastSeed = g.seedHash; rebuild(g.seedHash); }

          // Spawn a feeding projectile on a new signal.
          const sig = feedRef.current;
          if (sig && sig.id !== lastFeedId) {
            lastFeedId = sig.id;
            projectiles.push({ action: sig.action, t: 0 });
          }

          dispA = lerpRgb(dispA, hexToRgb(g.couleurA), 0.08);
          dispB = lerpRgb(dispB, hexToRgb(g.couleurB), 0.08);
          dispBg = lerpRgb(dispBg, tint(hexToRgb(g.couleurB), 0.82), 0.08);
          petalesShown += (g.petales - petalesShown) * 0.06;

          const meta = HUMEUR_META[g.humeur];
          spin += 0.003 * meta.pulse;
          gulp *= 0.88;

          p.background(dispBg[0], dispBg[1], dispBg[2]);
          p.ambientLight(120, 120, 128);
          p.directionalLight(160, 160, 168, -0.4, -0.6, -0.7);
          p.pointLight(105, 105, 112, -180, -220, 300);
          p.orbitControl(1.2, 1.2, 0.1);

          const S = Math.min(p.width, p.height);
          const R = S * 0.105;
          const petLen = R * 0.8;
          const petW = R * 0.32;
          const petThick = R * 0.28;

          const core = tint(dispA, 0.5);
          const cMain = vivid(dispA, 0.3, 0.02);
          const cAlt = vivid(dispB, 0.3, 0.02);
          const cShoe = vivid(rotateHue(dispB, 200), 0.25, 0.05);
          const cSole = vivid(rotateHue(dispA, 330), 0.25, 0.08);

          p.noStroke();
          p.push();
          p.rotateX(0.1);
          p.translate(0, -R * 0.95, 0);

          // Petals — pushed behind the head plane so the body occludes the
          // lower ones instead of clipping through them.
          const n = Math.max(1, Math.round(petalesShown));
          p.push();
          p.translate(0, -R * 0.1, -R * 0.32);
          p.rotateZ(spin);
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2;
            const v = vars[i % 12];
            setMat(petalColour(i / Math.max(1, n), v), 80, 16);
            p.push();
            p.rotateZ(ang);
            p.translate(0, -(R * 0.95 + petLen * v.len), 0);
            p.rotateX(-v.tilt);
            petalShape(petW * v.wid, petLen * v.len, petThick);
            p.pop();
          }
          p.pop();

          // Head + face (with a little gulp pulse when fed).
          const hs = 1 + 0.08 * gulp;
          p.push();
          p.scale(hs);
          setMat(core, 55, 16);
          p.push(); p.sphere(R, 40, 30); p.pop();
          drawFace(R, g.humeur);
          p.pop();

          drawBody(R, cMain, cAlt, cShoe, cSole);

          // Feeding projectiles flying into the mouth.
          const mouthY = R * 0.24;
          const mouth: [number, number, number] = [0, mouthY, surfZ(R, 0, mouthY, R * 0.04)];
          const start: [number, number, number] = [0, -R * 2.4, R * 1.7];
          for (let i = projectiles.length - 1; i >= 0; i--) {
            const pr = projectiles[i];
            pr.t += 0.025;
            if (pr.t >= 1) { projectiles.splice(i, 1); gulp = 1; continue; }
            const e = pr.t * (2 - pr.t); // easeOutQuad
            const x = start[0] + (mouth[0] - start[0]) * e;
            const y = start[1] + (mouth[1] - start[1]) * e;
            const z = start[2] + (mouth[2] - start[2]) * e;
            p.push();
            p.translate(x, y, z);
            setMat(FEED_COLOR[pr.action], 140, 30);
            if (pr.action === "eau") p.ellipsoid(R * 0.1, R * 0.14, R * 0.1, 12, 10);
            else p.sphere(R * 0.12, 14, 12);
            p.pop();
          }

          p.pop();
        };
      };

      instance = new P5(sketch, container);
      ro = new ResizeObserver(() => {
        if (!instance) return;
        instance.resizeCanvas(
          container.clientWidth || 600,
          container.clientHeight || 600,
        );
      });
      ro.observe(container);
    })();

    return () => {
      mounted = false;
      ro?.disconnect();
      instance?.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full touch-none" aria-hidden />;
}
