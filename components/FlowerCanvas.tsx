"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import type { Genome } from "@/lib/genome";
import { hexToRgb, lerpRgb, type RGB } from "@/lib/flower-engine";
import { HUMEUR_META } from "@/lib/humeur";
import { prngFromHex } from "@/lib/prng";

/** Mix a colour toward white by t (0 = colour, 1 = white). */
function tint(c: RGB, t: number): RGB {
  return [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t];
}

interface PetalVar {
  len: number;
  wid: number;
  hueShift: number;
  tilt: number;
}

/**
 * Full-3D flower rendered with p5's WebGL renderer: a glossy pastel core sphere
 * with a kawaii face, surrounded by 3D ellipsoid petals that slowly orbit the
 * core. Solid pastel background derived from the genome. Drag to orbit, scroll
 * (or pinch) to zoom. Deterministic per seed.
 */
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

      // Animated state (lerps toward genome each frame).
      let dispA: RGB = hexToRgb(genomeRef.current.couleurA);
      let dispB: RGB = hexToRgb(genomeRef.current.couleurB);
      let dispBg: RGB = tint(hexToRgb(genomeRef.current.couleurB), 0.84);
      let petalesShown = genomeRef.current.petales;
      let spin = 0;

      // Deterministic per-petal variation, stable per seed.
      let lastSeed = "";
      let vars: PetalVar[] = [];
      const buildVars = (seed: string) => {
        const r = prngFromHex(seed);
        const out: PetalVar[] = [];
        for (let i = 0; i < 12; i++) {
          out.push({
            len: 1 + (r() - 0.5) * 0.22,
            wid: 1 + (r() - 0.5) * 0.22,
            hueShift: (r() - 0.5) * 0.18,
            tilt: 0.18 + r() * 0.22,
          });
        }
        return out;
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

        const setMat = (c: RGB, spec = 255, shine = 60) => {
          p.fill(c[0], c[1], c[2]);
          p.ambientMaterial(c[0], c[1], c[2]);
          p.specularMaterial(spec);
          p.shininess(shine);
        };

        // A soft pastel petal colour: gradient A→B around the ring, hue-jittered
        // per petal, then lifted toward white so it reads glossy and pastel.
        const petalColour = (t: number, v: PetalVar): RGB => {
          const base = lerpRgb(dispA, dispB, t);
          const shifted: RGB = [
            Math.min(255, Math.max(0, base[0] + v.hueShift * 90)),
            Math.min(255, Math.max(0, base[1] - v.hueShift * 40)),
            Math.min(255, Math.max(0, base[2] + v.hueShift * 60)),
          ];
          return tint(shifted, 0.28);
        };

        p.draw = () => {
          const g = genomeRef.current;
          if (g.seedHash !== lastSeed) {
            lastSeed = g.seedHash;
            vars = buildVars(g.seedHash);
          }

          // Smooth transitions.
          dispA = lerpRgb(dispA, hexToRgb(g.couleurA), 0.08);
          dispB = lerpRgb(dispB, hexToRgb(g.couleurB), 0.08);
          dispBg = lerpRgb(dispBg, tint(hexToRgb(g.couleurB), 0.84), 0.08);
          petalesShown += (g.petales - petalesShown) * 0.06;

          const meta = HUMEUR_META[g.humeur];
          spin += 0.0032 * meta.pulse;

          p.background(dispBg[0], dispBg[1], dispBg[2]);

          // Lighting: soft fill + a key light for glossy highlights.
          p.ambientLight(170, 170, 178);
          p.directionalLight(255, 255, 255, -0.45, -0.7, -0.6);
          p.pointLight(255, 255, 255, -200, -260, 320);

          // Gentle interactive orbit (touch + mouse), plus a fixed front tilt.
          p.orbitControl(1.2, 1.2, 0.1);

          const S = Math.min(p.width, p.height);
          const coreR = S * 0.17;
          const petLen = coreR * 1.05;
          const petW = coreR * 0.34;
          const petThick = coreR * 0.3;

          p.noStroke();
          p.push();
          p.rotateX(0.18); // slight downward tilt for a 3D read

          // ── Petals (orbit the core slowly) ──
          const n = Math.max(1, Math.round(petalesShown));
          p.push();
          p.rotateZ(spin);
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2;
            const v = vars[i % 12];
            const col = petalColour(i / Math.max(1, n), v);
            p.push();
            p.rotateZ(ang);
            p.translate(0, -(coreR * 0.92 + petLen * v.len));
            p.rotateX(-v.tilt); // lift the tip toward the viewer
            setMat(col, 255, 70);
            p.ellipsoid(petW * v.wid, petLen * v.len, petThick, 18, 12);
            p.pop();
          }
          p.pop();

          // ── Core sphere (light pastel, stays put) ──
          const core = tint(dispA, 0.66);
          setMat(core, 200, 40);
          p.push();
          p.sphere(coreR, 36, 28);
          p.pop();

          // ── Face on the front of the core ──
          drawFace(p, coreR);

          p.pop();
        };

        // Kawaii closed-eye face, built from small 3D meshes on the core front.
        const drawFace = (pp: p5, R: number) => {
          const z = R * 0.9;
          const eyeY = -R * 0.05;
          const eyeDark: RGB = [60, 55, 70];
          const blush: RGB = [255, 175, 195];
          const nose: RGB = [255, 165, 185];

          // Eyes — flat dark closed lids.
          for (const sx of [-1, 1]) {
            pp.push();
            pp.translate(sx * R * 0.34, eyeY, z);
            setMat(eyeDark, 30, 10);
            pp.ellipsoid(R * 0.17, R * 0.05, R * 0.05, 14, 8);
            pp.pop();
          }
          // Blush.
          for (const sx of [-1, 1]) {
            pp.push();
            pp.translate(sx * R * 0.46, R * 0.16, z * 0.92);
            setMat(blush, 40, 10);
            pp.ellipsoid(R * 0.13, R * 0.08, R * 0.04, 14, 8);
            pp.pop();
          }
          // Nose.
          pp.push();
          pp.translate(0, R * 0.06, z * 1.02);
          setMat(nose, 60, 20);
          pp.sphere(R * 0.05, 12, 10);
          pp.pop();
          // Mouth — a little cluster of dots.
          const mouth: [number, number][] = [
            [-R * 0.08, R * 0.24],
            [0, R * 0.27],
            [R * 0.08, R * 0.24],
          ];
          for (const [mx, my] of mouth) {
            pp.push();
            pp.translate(mx, my, z * 0.98);
            setMat(eyeDark, 30, 10);
            pp.sphere(R * 0.035, 10, 8);
            pp.pop();
          }
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
