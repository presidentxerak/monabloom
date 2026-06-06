"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";

type RGB = [number, number, number];

/**
 * A tiny full-3D profile icon of the Gardener: a kawaii head with a wide straw
 * hat, a green band and a little leaf. It gently turns and bobs. Used as the
 * chatbot's avatar so the gardener feels alive next to its messages.
 */
export default function GardenerAvatar({ size = 44 }: { size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let instance: p5 | undefined;
    let mounted = true;

    (async () => {
      const P5 = (await import("p5")).default;
      const container = containerRef.current;
      if (!mounted || !container) return;

      const sketch = (p: p5) => {
        const R = size * 0.26;
        const skin: RGB = [255, 216, 186];
        const straw: RGB = [224, 188, 110];
        const strawDk: RGB = [198, 160, 86];
        const leaf: RGB = [86, 182, 110];
        const dark: RGB = [56, 44, 60];
        const blush: RGB = [255, 158, 184];

        const setMat = (c: RGB, spec = 50, shine = 10) => {
          p.fill(c[0], c[1], c[2]); p.ambientMaterial(c[0], c[1], c[2]);
          p.specularMaterial(spec); p.shininess(shine);
        };
        const surfZ = (x: number, y: number, out = 0) =>
          Math.sqrt(Math.max(0, R * R - x * x - y * y)) + out;
        const dot = (x: number, y: number, r: number, c: RGB) => {
          p.push(); p.translate(x, y, surfZ(x, y, R * 0.01)); setMat(c, 14, 6); p.sphere(r, 10, 8); p.pop();
        };

        p.setup = () => { p.createCanvas(size, size, p.WEBGL); p.frameRate(40); p.smooth(); };

        p.draw = () => {
          p.clear();
          p.ambientLight(168, 168, 174);
          p.directionalLight(180, 180, 188, -0.3, -0.6, -0.5);
          p.pointLight(140, 140, 150, -size, -size, size);
          p.noStroke();

          const t = p.frameCount / 40;
          p.push();
          p.scale(1, -1, 1); // p5 y is down; flip so the gardener sits upright
          p.translate(0, Math.sin(t * 1.2) * R * 0.05, 0);
          p.rotateZ(Math.sin(t * 0.8) * 0.07);
          p.rotateY(Math.sin(t * 0.9) * 0.5);

          // Head
          setMat(skin, 45, 10); p.push(); p.sphere(R, 26, 20); p.pop();

          // Cheeks
          for (const sx of [-1, 1]) {
            const x = sx * R * 0.5, y = -R * 0.12;
            p.push(); p.translate(x, y, surfZ(x, y, R * 0.01)); setMat(blush, 18, 6);
            p.ellipsoid(R * 0.16, R * 0.1, R * 0.05, 12, 8); p.pop();
          }
          // Eyes (+ glints)
          for (const sx of [-1, 1]) {
            const x = sx * R * 0.32, y = R * 0.04;
            p.push(); p.translate(x, y, surfZ(x, y, R * 0.01)); setMat(dark, 20, 8); p.sphere(R * 0.1, 12, 10); p.pop();
            const gx = x - sx * R * 0.03, gy = y + R * 0.035;
            p.push(); p.translate(gx, gy, surfZ(gx, gy, R * 0.06)); setMat([255, 255, 255], 200, 90); p.sphere(R * 0.03, 8, 6); p.pop();
          }
          // Nose
          dot(0, R * 0.14, R * 0.05, [255, 150, 175]);
          // Smile
          for (let k = -2; k <= 2; k++) dot(k * R * 0.06, R * 0.26 + Math.abs(k) * R * 0.03, R * 0.04, dark);

          // ── Straw hat (above the head: -y) ──
          setMat(strawDk, 30, 6); p.push(); p.translate(0, -R * 0.46, 0); p.rotateX(p.HALF_PI); p.cylinder(R * 1.45, R * 0.07, 26, 1); p.pop();
          setMat(straw, 40, 8); p.push(); p.translate(0, -R * 0.78, 0); p.scale(1, 0.7, 1); p.sphere(R * 0.74, 22, 16); p.pop();
          // Green band
          setMat(leaf, 35, 8); p.push(); p.translate(0, -R * 0.52, 0); p.rotateX(p.HALF_PI); p.torus(R * 0.74, R * 0.07, 22, 10); p.pop();
          // Little leaf tucked in the band
          setMat(leaf, 35, 8); p.push(); p.translate(R * 0.6, -R * 0.6, R * 0.4); p.rotateZ(-0.6); p.ellipsoid(R * 0.22, R * 0.09, R * 0.04, 12, 8); p.pop();

          p.pop();
        };
      };

      instance = new P5(sketch, container);
    })();

    return () => { mounted = false; instance?.remove(); };
  }, [size]);

  return <div ref={containerRef} style={{ width: size, height: size }} aria-hidden />;
}
