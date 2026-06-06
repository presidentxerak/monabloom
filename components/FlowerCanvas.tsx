"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import { hexToRgb, lerpRgb, type RGB } from "@/lib/flower-engine";
import { HUMEUR_META } from "@/lib/humeur";
import { prngFromHex, seedFromHex } from "@/lib/prng";

/** Mix a colour toward white by t (0 = colour, 1 = white). */
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
/** Boost saturation / shift lightness — keeps colours vivid, not washed out. */
function vivid(c: RGB, ds = 0.28, dl = 0): RGB {
  const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
  return hslToRgb(h, s + ds, l + dl);
}
function rotateHue(c: RGB, deg: number): RGB {
  const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
  return hslToRgb((h + deg + 360) % 360, s, l);
}

interface PetalVar {
  len: number;
  wid: number;
  hueShift: number;
  tilt: number;
}

/** 0..6 — which 3D petal geometry this flower uses (stable per seed). */
function petal3DStyle(seedHash: string): number {
  return seedFromHex(seedHash + "3dshape") % 7;
}

export default function FlowerCanvas({ genome }: { genome: Genome }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const genomeRef = useRef(genome);
  genomeRef.current = genome;

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
            tilt: 0.16 + r() * 0.24,
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

        // Petal colour: vivid gradient A→B with per-petal hue jitter (colourful).
        const petalColour = (t: number, v: PetalVar): RGB =>
          tint(rotateHue(vivid(lerpRgb(dispA, dispB, t), 0.3, 0.02), v.hueShift * 40), 0.04);

        const petalShape = (w: number, h: number, t: number) => {
          switch (shape) {
            case 1: // round blob
              p.ellipsoid(w * 1.1, h * 0.95, t * 1.1, 16, 12);
              break;
            case 2: // faceted diamond
              p.push(); p.rotateZ(Math.PI / 4); p.box(w * 1.5, h * 1.5, t * 1.4); p.pop();
              break;
            case 3: // capsule
              p.cylinder(w * 0.74, h * 1.7, 16, 1);
              p.push(); p.translate(0, -h * 0.85, 0); p.sphere(w * 0.74, 12, 10); p.pop();
              p.push(); p.translate(0, h * 0.85, 0); p.sphere(w * 0.74, 12, 10); p.pop();
              break;
            case 4: // pointed teardrop
              p.cone(w * 1.15, h * 2.0, 18, 1, true);
              break;
            case 5: // ring
              p.torus(h * 0.7, w * 0.48, 22, 12);
              break;
            case 6: // beads
              for (const yy of [-h * 0.7, 0, h * 0.7]) {
                p.push(); p.translate(0, yy, 0); p.sphere(w * 0.82, 12, 10); p.pop();
              }
              break;
            default: // oval
              p.ellipsoid(w, h, t, 18, 12);
          }
        };

        // ── Genscii-style bead body below the head ──
        const bead = (x: number, y: number, r: number, c: RGB) => {
          p.push(); p.translate(x, y, 0); setMat(c); p.sphere(r, 16, 12); p.pop();
        };
        const drawBody = (R: number, cMain: RGB, cAlt: RGB, cShoe: RGB, cSole: RGB) => {
          // neck
          bead(0, R * 1.05, R * 0.28, cAlt);
          bead(0, R * 1.32, R * 0.34, cMain);
          // torso column
          bead(0, R * 1.75, R * 0.55, cMain);
          bead(0, R * 2.4, R * 0.62, cMain);
          bead(0, R * 3.0, R * 0.54, cMain);
          // torso accents
          for (const sx of [-1, 1]) {
            bead(sx * R * 0.42, R * 2.05, R * 0.4, cAlt);
            bead(sx * R * 0.4, R * 2.72, R * 0.42, cAlt);
            // shoulders + arms
            bead(sx * R * 0.62, R * 1.72, R * 0.42, cMain);
            bead(sx * R * 0.95, R * 2.0, R * 0.34, cAlt);
            bead(sx * R * 1.06, R * 2.45, R * 0.3, cMain);
            bead(sx * R * 1.0, R * 2.85, R * 0.3, cAlt);
            // hips + legs
            bead(sx * R * 0.32, R * 3.4, R * 0.5, cMain);
            bead(sx * R * 0.34, R * 3.95, R * 0.4, cMain);
            bead(sx * R * 0.36, R * 4.45, R * 0.36, cAlt);
            bead(sx * R * 0.36, R * 4.78, R * 0.3, cMain);
            // shoe
            p.push(); p.translate(sx * R * 0.36, R * 5.02, R * 0.16); setMat(cShoe); p.ellipsoid(R * 0.5, R * 0.3, R * 0.6, 16, 12); p.pop();
            p.push(); p.translate(sx * R * 0.36, R * 5.22, R * 0.16); setMat(cSole); p.ellipsoid(R * 0.52, R * 0.13, R * 0.62, 16, 12); p.pop();
            p.push(); p.translate(sx * R * 0.36, R * 5.32, R * 0.16); setMat([248, 246, 242]); p.ellipsoid(R * 0.5, R * 0.1, R * 0.6, 16, 12); p.pop();
          }
        };

        // ── Kawaii face ──
        const drawFace = (R: number, mood: string) => {
          const z = R * 0.9;
          const dark: RGB = [70, 62, 80];
          const blush: RGB = [255, 168, 190];
          const nose: RGB = [255, 158, 180];

          // Closed happy eyes — gentle arcs of small dark spheres.
          for (const sx of [-1, 1]) {
            for (let k = -2; k <= 2; k++) {
              const fx = sx * R * 0.34 + k * R * 0.045;
              const fy = -R * 0.06 + Math.abs(k) * R * 0.018; // smile curve
              p.push();
              p.translate(fx, fy, z * 1.02);
              setMat(dark, 20, 8);
              p.sphere(R * 0.028, 8, 6);
              p.pop();
            }
          }
          // Blush.
          for (const sx of [-1, 1]) {
            p.push();
            p.translate(sx * R * 0.48, R * 0.16, z * 0.92);
            setMat(blush, 30, 8);
            p.ellipsoid(R * 0.13, R * 0.08, R * 0.04, 14, 8);
            p.pop();
          }
          // Nose.
          p.push();
          p.translate(0, R * 0.05, z * 1.05);
          setMat(nose, 50, 16);
          p.sphere(R * 0.045, 12, 10);
          p.pop();
          // Mouth — varies by mood.
          const mouth: [number, number][] = [];
          if (mood === "joyeuse") {
            for (let k = -2; k <= 2; k++) mouth.push([k * R * 0.055, R * 0.22 + Math.abs(k) * R * 0.03]);
          } else if (mood === "espiegle") {
            mouth.push([-R * 0.06, R * 0.22], [-R * 0.02, R * 0.25], [R * 0.02, R * 0.25], [R * 0.06, R * 0.22]);
          } else if (mood === "melancolique") {
            for (let k = -2; k <= 2; k++) mouth.push([k * R * 0.05, R * 0.26 - Math.abs(k) * R * 0.022]);
          } else {
            mouth.push([-R * 0.05, R * 0.24], [0, R * 0.255], [R * 0.05, R * 0.24]);
          }
          for (const [mx, my] of mouth) {
            p.push();
            p.translate(mx, my, z * 1.0);
            setMat(dark, 20, 8);
            p.sphere(R * 0.03, 10, 8);
            p.pop();
          }
        };

        p.draw = () => {
          const g = genomeRef.current;
          if (g.seedHash !== lastSeed) {
            lastSeed = g.seedHash;
            rebuild(g.seedHash);
          }

          dispA = lerpRgb(dispA, hexToRgb(g.couleurA), 0.08);
          dispB = lerpRgb(dispB, hexToRgb(g.couleurB), 0.08);
          dispBg = lerpRgb(dispBg, tint(hexToRgb(g.couleurB), 0.82), 0.08);
          petalesShown += (g.petales - petalesShown) * 0.06;

          const meta = HUMEUR_META[g.humeur];
          spin += 0.0032 * meta.pulse;

          p.background(dispBg[0], dispBg[1], dispBg[2]);

          // Softer lighting so colours stay rich and saturated.
          p.ambientLight(118, 118, 126);
          p.directionalLight(165, 165, 172, -0.4, -0.6, -0.7);
          p.pointLight(110, 110, 116, -180, -220, 300);

          p.orbitControl(1.2, 1.2, 0.1);

          const S = Math.min(p.width, p.height);
          const R = S * 0.095;
          const petLen = R * 1.0;
          const petW = R * 0.34;
          const petThick = R * 0.3;

          // Colour set.
          const core = tint(dispA, 0.5);
          const cMain = vivid(dispA, 0.3, 0.02);
          const cAlt = vivid(dispB, 0.3, 0.02);
          const cShoe = vivid(rotateHue(dispB, 200), 0.25, 0.05);
          const cSole = vivid(rotateHue(dispA, 330), 0.25, 0.08);

          p.noStroke();
          p.push();
          p.rotateX(0.12);
          p.translate(0, -R * 1.65, 0); // vertical centring (head + body)

          // Petals orbit the head.
          const n = Math.max(1, Math.round(petalesShown));
          p.push();
          p.rotateZ(spin);
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2;
            const v = vars[i % 12];
            setMat(petalColour(i / Math.max(1, n), v), 80, 16);
            p.push();
            p.rotateZ(ang);
            p.translate(0, -(R * 0.92 + petLen * v.len), 0);
            p.rotateX(-v.tilt);
            petalShape(petW * v.wid, petLen * v.len, petThick);
            p.pop();
          }
          p.pop();

          // Head (light pastel) + face.
          setMat(core, 60, 18);
          p.push(); p.sphere(R, 40, 30); p.pop();
          drawFace(R, g.humeur);

          // Body.
          drawBody(R, cMain, cAlt, cShoe, cSole);

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
