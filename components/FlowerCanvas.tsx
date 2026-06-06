"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import { hexToRgb, lerpRgb, type RGB } from "@/lib/flower-engine";
import { HUMEUR_META } from "@/lib/humeur";
import { prngFromHex, seedFromHex } from "@/lib/prng";

export interface FeedSignal { action: "eau" | "engrais" | "soleil" | "pouvoir"; id: number; }
export interface PowerSignal { id: number; }

function tint(c: RGB, t: number): RGB {
  return [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2; let h = 0, s = 0; const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): RGB {
  s = Math.min(1, Math.max(0, s)); l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2; let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
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
interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; col: RGB; tw: number; sz: number; }

const SPARKLE_COLORS: RGB[] = [
  [255, 255, 255], [255, 233, 168], [255, 179, 230], [217, 179, 255],
  [179, 240, 255], [201, 255, 217], [255, 210, 120],
];

function computeRig(dance: number, t: number) {
  let bobY = Math.sin(t * 1.6) * 0.05;
  let spin = 0, twist = 0, headTilt = Math.sin(t * 1.6) * 0.04, sway = 0;
  let armL = 0.2 + Math.sin(t * 1.6) * 0.06;
  let armR = 0.2 + Math.sin(t * 1.6 + 1) * 0.06;
  let legLift = 0;
  switch (dance) {
    case 1: armR = Math.PI * 0.82 + Math.sin(t * 9) * 0.25; armL = 0.22; headTilt = Math.sin(t * 4.5) * 0.06; bobY = Math.sin(t * 3) * 0.03; break;
    case 2: twist = Math.sin(t * 3) * 0.6; sway = Math.sin(t * 3) * 0.1; armL = Math.PI * 0.45 + Math.sin(t * 3) * 0.25; armR = Math.PI * 0.45 - Math.sin(t * 3) * 0.25; bobY = Math.abs(Math.sin(t * 3)) * 0.04; headTilt = Math.sin(t * 3) * 0.08; break;
    case 3: { const j = Math.max(0, Math.sin(t * 4)); bobY = -j * 0.5; legLift = j * 0.5; armL = armR = Math.PI * 0.5 + j * 0.45; headTilt = 0; break; }
    case 4: { const q = Math.round(Math.sin(t * 2) * 2) / 2; armR = Math.PI * 0.5 + q * 0.5; armL = Math.PI * 0.5 - q * 0.5; headTilt = Math.round(Math.sin(t * 1.5)) * 0.13; bobY = 0; break; }
    case 5: spin = t * 2.2; armL = armR = Math.PI * 0.5; bobY = Math.sin(t * 4) * 0.03; break;
  }
  return { bobY, spin, twist, headTilt, sway, armL, armR, legLift };
}

export default function FlowerCanvas({
  genome, feed = null, dance = 0, power = null,
}: {
  genome: Genome; feed?: FeedSignal | null; dance?: number; power?: PowerSignal | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const genomeRef = useRef(genome); genomeRef.current = genome;
  const feedRef = useRef(feed); feedRef.current = feed;
  const danceRef = useRef(dance); danceRef.current = dance;
  const powerRef = useRef(power); powerRef.current = power;

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
      let petalSpin = 0, gulp = 0, danceT = 0;
      let lastFeedId = feedRef.current?.id ?? -1;
      let lastPowerId = powerRef.current?.id ?? -1;
      const projectiles: Projectile[] = [];
      const particles: Particle[] = [];

      let lastSeed = "";
      let vars: PetalVar[] = [];
      let seedShape = 0;
      const rebuild = (seed: string) => {
        const r = prngFromHex(seed);
        const out: PetalVar[] = [];
        for (let i = 0; i < 12; i++) out.push({ len: 1 + (r() - 0.5) * 0.24, wid: 1 + (r() - 0.5) * 0.24, hueShift: (r() - 0.5) * 0.5, tilt: 0.16 + r() * 0.22 });
        vars = out; seedShape = seedFromHex(seed + "3dshape") % 7;
      };

      const sketch = (p: p5) => {
        const measure = () => ({ w: container.clientWidth || 600, h: container.clientHeight || 600 });
        p.setup = () => { const { w, h } = measure(); p.createCanvas(w, h, p.WEBGL); p.frameRate(60); p.smooth(); };

        const setMat = (c: RGB, spec = 70, shine = 14) => { p.fill(c[0], c[1], c[2]); p.ambientMaterial(c[0], c[1], c[2]); p.specularMaterial(spec); p.shininess(shine); };
        const surfZ = (R: number, x: number, y: number, out = 0) => Math.sqrt(Math.max(0, R * R - x * x - y * y)) + out;
        const ball = (x: number, y: number, z: number, r: number, c: RGB) => { p.push(); p.translate(x, y, z); setMat(c); p.sphere(r, 14, 11); p.pop(); };

        const petalColour = (t: number, v: PetalVar): RGB => tint(rotateHue(vivid(lerpRgb(dispA, dispB, t), 0.3, 0.02), v.hueShift * 40), 0.04);

        const petalShape = (shape: number, w: number, h: number, t: number) => {
          switch (shape) {
            case 1: p.ellipsoid(w * 1.1, h * 0.95, t * 1.1, 16, 12); break;
            case 2: p.push(); p.rotateZ(Math.PI / 4); p.box(w * 1.4, h * 1.4, t * 1.3); p.pop(); break;
            case 3: p.cylinder(w * 0.72, h * 1.6, 16, 1); p.push(); p.translate(0, -h * 0.8, 0); p.sphere(w * 0.72, 12, 10); p.pop(); p.push(); p.translate(0, h * 0.8, 0); p.sphere(w * 0.72, 12, 10); p.pop(); break;
            case 4: p.cone(w * 1.1, h * 1.9, 18, 1, true); break;
            case 5: p.torus(h * 0.5, w * 0.42, 22, 12); break;
            case 6: for (const yy of [-h * 0.65, 0, h * 0.65]) { p.push(); p.translate(0, yy, 0); p.sphere(w * 0.8, 12, 10); p.pop(); } break;
            default: p.ellipsoid(w, h, t, 18, 12);
          }
        };

        // NOTE: p5's cone apex points toward +Y by default, so cones that should
        // point up are flipped with rotateZ(PI).
        const drawHat = (R: number, type: string) => {
          if (!type || type === "none") return;
          if (type === "cap") {
            // Small rounded crown sitting on the top of the head + forward brim.
            setMat([230, 70, 90]);
            p.push(); p.translate(0, -R * 0.82, 0); p.scale(1.15, 0.78, 1.15); p.sphere(R * 0.56, 24, 18); p.pop();
            setMat([205, 52, 72]);
            p.push(); p.translate(0, -R * 0.5, R * 0.62); p.rotateX(0.15); p.ellipsoid(R * 0.42, R * 0.06, R * 0.3, 18, 8); p.pop();
          } else if (type === "party") {
            // Cone flipped so the apex points up; base rests on the head top.
            setMat([232, 92, 200]);
            p.push(); p.translate(0, -R * 1.5, 0); p.rotateZ(Math.PI); p.cone(R * 0.42, R * 1.0, 22, 1, true); p.pop();
            ball(0, -R * 2.02, 0, R * 0.11, [255, 240, 120]);
          } else if (type === "tophat") {
            setMat([40, 36, 48]);
            p.push(); p.translate(0, -R * 1.5, 0); p.cylinder(R * 0.46, R * 1.0, 24, 1); p.pop();
            p.push(); p.translate(0, -R * 1.0, 0); p.cylinder(R * 0.78, R * 0.1, 28, 1); p.pop();
          } else if (type === "crown") {
            // Horizontal gold band around the head + upward spikes (flipped).
            setMat([240, 195, 60]);
            p.push(); p.translate(0, -R * 0.78, 0); p.rotateX(Math.PI / 2); p.torus(R * 0.62, R * 0.1, 24, 10); p.pop();
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * Math.PI * 2;
              p.push(); p.translate(Math.cos(a) * R * 0.62, -R * 0.92, Math.sin(a) * R * 0.62); p.rotateZ(Math.PI); p.cone(R * 0.09, R * 0.26, 10, 1, true); p.pop();
            }
          } else if (type === "beret") {
            // Flat disc on the very top, leaning slightly back, with a stalk.
            setMat([60, 70, 140]);
            p.push(); p.translate(0, -R * 0.92, -R * 0.04); p.rotateX(-0.18); p.scale(1.25, 0.34, 1.25); p.sphere(R * 0.6, 24, 14); p.pop();
            ball(0, -R * 1.12, -R * 0.04, R * 0.06, [60, 70, 140]);
          }
        };

        const drawGlasses = (R: number, type: string) => {
          if (!type || type === "none") return;
          // Lenses sit exactly on the eyes; everything faces the camera (+z).
          const ey = -R * 0.05, ex = R * 0.3;
          const lensZ = surfZ(R, ex, ey, R * 0.05);
          const bridgeZ = surfZ(R, 0, ey, R * 0.05);
          const dark: RGB = [22, 20, 30];
          const bridge = (col: RGB, w: number) => { p.push(); p.translate(0, ey, bridgeZ); setMat(col, 120, 40); p.box(w, R * 0.04, R * 0.05); p.pop(); };
          if (type === "sun" || type === "thug") {
            const box = type === "thug";
            for (const sx of [-1, 1]) {
              p.push(); p.translate(sx * ex, ey, lensZ); setMat(dark, 220, 90);
              if (box) p.box(R * 0.3, R * 0.2, R * 0.05); else p.ellipsoid(R * 0.17, R * 0.13, R * 0.04, 18, 12);
              p.pop();
            }
            bridge(dark, R * 0.2);
          } else if (type === "round") {
            for (const sx of [-1, 1]) { p.push(); p.translate(sx * ex, ey, lensZ); setMat(dark); p.torus(R * 0.14, R * 0.028, 22, 10); p.pop(); }
            bridge(dark, R * 0.14);
          } else if (type === "heart") {
            for (const sx of [-1, 1]) { p.push(); p.translate(sx * ex, ey, lensZ); setMat([255, 80, 130], 160, 50); p.torus(R * 0.14, R * 0.04, 22, 10); p.pop(); }
            bridge([255, 80, 130], R * 0.12);
          } else if (type === "star") {
            for (const sx of [-1, 1]) {
              p.push(); p.translate(sx * ex, ey, lensZ); setMat([255, 214, 70], 180, 60);
              p.push(); p.box(R * 0.26, R * 0.06, R * 0.05); p.pop();
              p.push(); p.box(R * 0.06, R * 0.26, R * 0.05); p.pop();
              p.pop();
            }
            bridge([255, 214, 70], R * 0.12);
          }
        };

        const drawShoe = (R: number, fx: number, fy: number, type: string, colShoe: RGB, colSole: RGB) => {
          const z = R * 0.16;
          switch (type) {
            case "boot":
              p.push(); p.translate(fx, fy - R * 0.1, z * 0.6); setMat(colShoe); p.ellipsoid(R * 0.42, R * 0.5, R * 0.5, 16, 12); p.pop();
              p.push(); p.translate(fx, fy + R * 0.2, z); setMat(colSole); p.ellipsoid(R * 0.5, R * 0.14, R * 0.66, 16, 12); p.pop(); break;
            case "sandal":
              p.push(); p.translate(fx, fy + R * 0.16, z); setMat(colSole); p.ellipsoid(R * 0.46, R * 0.1, R * 0.6, 16, 12); p.pop();
              p.push(); p.translate(fx, fy, z); setMat(colShoe); p.box(R * 0.5, R * 0.05, R * 0.12); p.pop(); break;
            case "platform":
              p.push(); p.translate(fx, fy, z); setMat(colShoe); p.ellipsoid(R * 0.5, R * 0.28, R * 0.6, 16, 12); p.pop();
              p.push(); p.translate(fx, fy + R * 0.22, z); setMat(colSole); p.ellipsoid(R * 0.54, R * 0.26, R * 0.66, 16, 12); p.pop(); break;
            case "classic":
              p.push(); p.translate(fx, fy, z); setMat(colShoe); p.sphere(R * 0.42, 16, 12); p.pop();
              p.push(); p.translate(fx, fy + R * 0.18, z); setMat(colSole); p.ellipsoid(R * 0.46, R * 0.12, R * 0.56, 16, 12); p.pop(); break;
            case "redhi":
              p.push(); p.translate(fx, fy - R * 0.12, z * 0.6); setMat([220, 50, 60]); p.ellipsoid(R * 0.4, R * 0.55, R * 0.48, 16, 12); p.pop();
              p.push(); p.translate(fx, fy + R * 0.22, z); setMat([255, 255, 255]); p.ellipsoid(R * 0.5, R * 0.13, R * 0.64, 16, 12); p.pop(); break;
            default: // sneaker
              p.push(); p.translate(fx, fy, z); setMat(colShoe); p.ellipsoid(R * 0.5, R * 0.3, R * 0.62, 16, 12); p.pop();
              p.push(); p.translate(fx, fy + R * 0.18, z); setMat(colSole); p.ellipsoid(R * 0.52, R * 0.13, R * 0.64, 16, 12); p.pop();
          }
        };

        const drawFace = (R: number, mood: string, t: number) => {
          const dark: RGB = [40, 34, 48], blush: RGB = [255, 160, 185], nose: RGB = [255, 150, 175], white: RGB = [255, 255, 255];
          const blinking = (t % 3.4) < 0.14; // periodic blink for open-eye moods

          const closedArc = (sx: number, sad = false) => {
            const offs: [number, number][] = sad ? [[-0.1, -0.02], [0, 0.02], [0.1, -0.02]] : [[-0.1, 0], [0, -0.03], [0.1, 0]];
            for (const [ox, oy] of offs) {
              const x = sx * R * 0.32 + ox * R, y = -R * 0.04 + oy * R;
              p.push(); p.translate(x, y, surfZ(R, x, y, R * 0.01)); setMat(dark, 15, 6); p.sphere(R * 0.05, 10, 8); p.pop();
            }
          };
          const openEye = (sx: number) => {
            const x = sx * R * 0.34, y = -R * 0.05;
            p.push(); p.translate(x, y, surfZ(R, x, y, R * 0.01)); setMat(dark, 20, 8); p.scale(1, blinking ? 0.12 : 1, 1); p.sphere(R * 0.088, 14, 12); p.pop();
            if (!blinking) { const sxx = x - sx * R * 0.03, syy = y - R * 0.035; p.push(); p.translate(sxx, syy, surfZ(R, sxx, syy, R * 0.05)); setMat(white, 200, 90); p.sphere(R * 0.026, 8, 6); p.pop(); }
          };

          // Eyes vary by mood.
          if (mood === "joyeuse") { openEye(-1); openEye(1); }
          else if (mood === "espiegle") { closedArc(-1); openEye(1); } // wink
          else if (mood === "melancolique") {
            closedArc(-1, true); closedArc(1, true);
            const tx = -R * 0.3, ty = R * 0.04 + ((t % 2) / 2) * R * 0.26; // sliding tear
            p.push(); p.translate(tx, ty, surfZ(R, tx, ty, R * 0.03)); setMat([120, 185, 255], 200, 90); p.sphere(R * 0.035, 10, 8); p.pop();
          } else { closedArc(-1); closedArc(1); } // sereine / reveuse

          for (const sx of [-1, 1]) { const x = sx * R * 0.5, y = R * 0.14; p.push(); p.translate(x, y, surfZ(R, x, y)); setMat(blush, 25, 6); p.ellipsoid(R * 0.14, R * 0.09, R * 0.05, 14, 8); p.pop(); }
          { const x = 0, y = R * 0.04; p.push(); p.translate(x, y, surfZ(R, x, y, R * 0.02)); setMat(nose, 40, 12); p.sphere(R * 0.05, 12, 10); p.pop(); }

          // Mouth varies by mood + a tiny breathing bob.
          const bob = Math.sin(t * 2.6) * R * 0.008;
          const mouth: [number, number, number][] = [];
          const add = (x: number, y: number, r: number) => mouth.push([x, y + bob, r]);
          if (mood === "joyeuse") for (let k = -3; k <= 3; k++) add(k * R * 0.05, R * 0.2 + Math.abs(k) * R * 0.03, R * 0.045);
          else if (mood === "espiegle") { add(-R * 0.09, R * 0.2, R * 0.045); add(-R * 0.03, R * 0.24, R * 0.045); add(R * 0.03, R * 0.24, R * 0.045); add(R * 0.09, R * 0.2, R * 0.045); }
          else if (mood === "melancolique") for (let k = -2; k <= 2; k++) add(k * R * 0.055, R * 0.27 - Math.abs(k) * R * 0.025, R * 0.04);
          else if (mood === "reveuse") for (let k = -2; k <= 2; k++) add(k * R * 0.05, R * 0.22 + Math.abs(k) * R * 0.012, R * 0.035);
          else for (let k = -2; k <= 2; k++) add(k * R * 0.05, R * 0.21 + Math.abs(k) * R * 0.02, R * 0.04);
          for (const [mx, my, mr] of mouth) { p.push(); p.translate(mx, my, surfZ(R, mx, my, R * 0.01)); setMat(dark, 15, 6); p.sphere(mr, 10, 8); p.pop(); }
        };

        // A real themed 3D object per feed action, drawn centred at the origin.
        const drawFeedObject = (action: FeedSignal["action"], R: number) => {
          if (action === "eau") { // water droplet (round bottom, point up)
            setMat([95, 180, 255], 200, 60);
            p.push(); p.translate(0, R * 0.05, 0); p.sphere(R * 0.12, 16, 12); p.pop();
            p.push(); p.translate(0, -R * 0.14, 0); p.rotateZ(Math.PI); p.cone(R * 0.1, R * 0.2, 16, 1, true); p.pop();
          } else if (action === "engrais") { // burger
            setMat([238, 172, 92]); p.push(); p.translate(0, -R * 0.12, 0); p.scale(1, 0.66, 1); p.sphere(R * 0.18, 18, 14); p.pop();
            setMat([255, 240, 130]); p.push(); p.translate(0, -R * 0.12, R * 0.1); p.sphere(R * 0.02, 8, 6); p.pop();
            setMat([110, 200, 95]); p.push(); p.translate(0, -R * 0.02, 0); p.cylinder(R * 0.19, R * 0.04, 18, 1); p.pop();
            setMat([122, 70, 42]); p.push(); p.translate(0, R * 0.05, 0); p.cylinder(R * 0.16, R * 0.08, 18, 1); p.pop();
            setMat([228, 160, 84]); p.push(); p.translate(0, R * 0.14, 0); p.cylinder(R * 0.16, R * 0.07, 18, 1); p.pop();
          } else if (action === "soleil") { // sun
            setMat([255, 208, 72], 200, 50); p.sphere(R * 0.13, 18, 14);
            setMat([255, 180, 40]);
            for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; p.push(); p.translate(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2, 0); p.rotateZ(a - Math.PI / 2); p.cone(R * 0.04, R * 0.12, 8, 1, true); p.pop(); }
          } else { // power star
            setMat([255, 80, 220], 200, 60);
            p.push(); p.box(R * 0.36, R * 0.09, R * 0.07); p.pop();
            p.push(); p.box(R * 0.09, R * 0.36, R * 0.07); p.pop();
            setMat([255, 224, 96]);
            p.push(); p.rotateZ(Math.PI / 4); p.box(R * 0.26, R * 0.07, R * 0.06); p.pop();
            p.push(); p.rotateZ(Math.PI / 4); p.box(R * 0.07, R * 0.26, R * 0.06); p.pop();
          }
        };

        p.draw = () => {
          const g = genomeRef.current;
          if (g.seedHash !== lastSeed) { lastSeed = g.seedHash; rebuild(g.seedHash); }

          const sig = feedRef.current;
          if (sig && sig.id !== lastFeedId) { lastFeedId = sig.id; projectiles.push({ action: sig.action, t: 0 }); }
          const pw = powerRef.current;
          if (pw && pw.id !== lastPowerId) {
            lastPowerId = pw.id;
            for (let i = 0; i < 70; i++) {
              const a = Math.random() * Math.PI * 2;
              const sp = 0.6 + Math.random() * 2.4;
              particles.push({
                x: (Math.random() - 0.5) * 2, y: -1 + Math.random() * 2, z: (Math.random() - 0.5) * 2,
                vx: Math.cos(a) * sp, vy: -(0.6 + Math.random() * 1.6), vz: Math.sin(a) * sp,
                life: 1 + Math.random() * 0.4, col: SPARKLE_COLORS[(Math.random() * SPARKLE_COLORS.length) | 0],
                tw: Math.random() * Math.PI * 2, sz: 0.6 + Math.random() * 0.9,
              });
            }
          }

          dispA = lerpRgb(dispA, hexToRgb(g.couleurA), 0.08);
          dispB = lerpRgb(dispB, hexToRgb(g.couleurB), 0.08);
          dispBg = lerpRgb(dispBg, tint(hexToRgb(g.couleurB), 0.82), 0.08);
          petalesShown += (g.petales - petalesShown) * 0.06;

          const meta = HUMEUR_META[g.humeur];
          petalSpin += 0.003 * meta.pulse * (g.vitesse ?? 1);
          danceT += 0.03;
          gulp *= 0.88;

          p.background(dispBg[0], dispBg[1], dispBg[2]);
          p.ambientLight(120, 120, 128);
          p.directionalLight(160, 160, 168, -0.4, -0.6, -0.7);
          p.pointLight(105, 105, 112, -180, -220, 300);
          p.orbitControl(1.2, 1.2, 0.1);

          const S = Math.min(p.width, p.height);
          const R = S * 0.105;
          const petLen = R * 0.8, petW = R * 0.32, petThick = R * 0.28;
          const shape = g.forme != null ? g.forme : seedShape;

          const core = tint(dispA, 0.5);
          const cMain = vivid(dispA, 0.3, 0.02);
          const cAlt = vivid(dispB, 0.3, 0.02);
          const cShoe = vivid(rotateHue(dispB, 200), 0.25, 0.05);
          const cSole = vivid(rotateHue(dispA, 330), 0.25, 0.08);

          const rig = computeRig(danceRef.current, danceT);

          p.noStroke();
          p.push();
          p.scale(g.taille ?? 1);
          p.rotateX(0.1);
          p.translate(rig.sway * R, -R * 0.95 + rig.bobY * R, 0);
          p.rotateY(rig.spin + rig.twist);

          // Petals around the head.
          const n = Math.max(1, Math.round(petalesShown));
          p.push();
          p.translate(0, -R * 0.1, -R * 0.32);
          p.rotateZ(petalSpin);
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2; const v = vars[i % 12];
            setMat(petalColour(i / Math.max(1, n), v), 80, 16);
            p.push(); p.rotateZ(ang); p.translate(0, -(R * 0.95 + petLen * v.len), 0); p.rotateX(-v.tilt);
            petalShape(shape, petW * v.wid, petLen * v.len, petThick); p.pop();
          }
          p.pop();

          // Head + face + accessories.
          p.push();
          p.rotateZ(rig.headTilt);
          p.scale(1 + 0.08 * gulp);
          setMat(core, 55, 16); p.push(); p.sphere(R, 40, 30); p.pop();
          drawFace(R, g.humeur, danceT);
          drawHat(R, g.chapeau ?? "none");
          drawGlasses(R, g.lunettes ?? "none");
          p.pop();

          // Detached bead body.
          ball(0, R * 1.0, 0, R * 0.3, cAlt);
          ball(0, R * 1.5, 0, R * 0.36, cMain);
          ball(0, R * 2.05, 0, R * 0.36, cMain);
          ball(0, R * 2.55, 0, R * 0.32, cAlt);
          for (const sx of [-1, 1]) {
            ball(sx * R * 0.5, R * 1.4, 0, R * 0.3, cMain);
            const aAng = sx > 0 ? rig.armR : rig.armL;
            const shX = sx * R * 0.5, shY = R * 1.4;
            const arm: [number, RGB][] = [[0.28, cAlt], [0.26, cMain], [0.24, cAlt]];
            for (let k = 0; k < arm.length; k++) {
              const dist = (k + 1) * R * 0.55;
              const x = shX + sx * Math.sin(aAng) * dist;
              const y = shY + Math.cos(aAng) * dist - (k + 1) * R * 0.02;
              ball(x, y, 0, R * arm[k][0], arm[k][1]);
            }
            const hipX = sx * R * 0.26, hipY = R * 2.75;
            const legLen = R * 0.55 * (1 - rig.legLift * 0.55);
            const leg: [number, RGB][] = [[0.32, cMain], [0.28, cAlt]];
            let fy = hipY;
            for (let k = 0; k < leg.length; k++) { fy = hipY + (k + 1) * legLen; ball(hipX, fy, 0, R * leg[k][0], leg[k][1]); }
            drawShoe(R, hipX, fy + R * 0.35, g.chaussures ?? "sneaker", cShoe, cSole);
          }

          // Feeding projectiles → mouth.
          const mouthY = R * 0.24;
          const mouth: [number, number, number] = [0, mouthY, surfZ(R, 0, mouthY, R * 0.04)];
          const start: [number, number, number] = [0, -R * 2.4, R * 1.7];
          for (let i = projectiles.length - 1; i >= 0; i--) {
            const pr = projectiles[i]; pr.t += 0.025;
            if (pr.t >= 1) { projectiles.splice(i, 1); gulp = 1; continue; }
            const e = pr.t * (2 - pr.t);
            p.push();
            p.translate(start[0] + (mouth[0] - start[0]) * e, start[1] + (mouth[1] - start[1]) * e, start[2] + (mouth[2] - start[2]) * e);
            p.rotateY(pr.t * 4); p.rotateZ(pr.t * 2);
            const grow = 0.7 + 0.3 * e;
            p.scale(grow);
            drawFeedObject(pr.action, R);
            p.pop();
          }

          // Power particles — twinkling sparkle-stars that float up like fairy dust.
          for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.x += pt.vx * 0.6; pt.y += pt.vy * 0.6; pt.z += pt.vz * 0.6;
            pt.vy += 0.02; pt.vx *= 0.97; pt.vz *= 0.97; // gentle drift + slowdown
            pt.life -= 0.011;
            if (pt.life <= 0) { particles.splice(i, 1); continue; }
            const tw = 0.55 + 0.45 * Math.sin(danceT * 9 + pt.tw);
            const s = (R * 0.06 * pt.sz * Math.min(1, pt.life) * tw) + R * 0.008;
            p.push();
            p.translate(pt.x * R * 0.22, pt.y * R * 0.22, pt.z * R * 0.22);
            p.rotateZ(pt.tw + danceT);
            setMat(pt.col, 220, 90);
            p.push(); p.box(s * 2.6, s * 0.5, s * 0.5); p.pop(); // star arms
            p.push(); p.box(s * 0.5, s * 2.6, s * 0.5); p.pop();
            p.push(); p.sphere(s * 0.8, 6, 6); p.pop(); // bright centre
            p.pop();
          }

          p.pop();
        };
      };

      instance = new P5(sketch, container);
      ro = new ResizeObserver(() => { if (!instance) return; instance.resizeCanvas(container.clientWidth || 600, container.clientHeight || 600); });
      ro.observe(container);
    })();

    return () => { mounted = false; ro?.disconnect(); instance?.remove(); };
  }, []);

  return <div ref={containerRef} className="h-full w-full touch-none" aria-hidden />;
}
