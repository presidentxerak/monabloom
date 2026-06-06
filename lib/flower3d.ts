// Shared 3D Flowermon character renderer (p5 WEBGL). Draws the full character
// (petals, head, kawaii face, accessories, detached bead body) with the head at
// the local origin and the body extending downward (+y). Used by the creator's
// canvas and the Blitz Garden metaverse so every character looks identical.

import type p5 from "p5";
import type { Genome } from "./genome";
import { hexToRgb, lerpRgb, type RGB } from "./flower-engine";
import { prngFromHex, seedFromHex } from "./prng";

function tint(c: RGB, t: number): RGB {
  return [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2; let h = 0, s = 0; const d = max - min;
  if (d !== 0) { s = d / (1 - Math.abs(2 * l - 1)); if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): RGB {
  s = Math.min(1, Math.max(0, s)); l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function vivid(c: RGB, ds = 0.28, dl = 0): RGB { const [h, s, l] = rgbToHsl(c[0], c[1], c[2]); return hslToRgb(h, s + ds, l + dl); }
function rotateHue(c: RGB, deg: number): RGB { const [h, s, l] = rgbToHsl(c[0], c[1], c[2]); return hslToRgb((h + deg + 360) % 360, s, l); }

function petal3DStyle(seedHash: string): number { return seedFromHex(seedHash + "3dshape") % 7; }

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

export function drawFlowermon(p: p5, genome: Genome, R: number, t: number, dance = 0, lod = 0) {
  const setMat = (c: RGB, spec = 70, shine = 14) => { p.fill(c[0], c[1], c[2]); p.ambientMaterial(c[0], c[1], c[2]); p.specularMaterial(spec); p.shininess(shine); };
  const surfZ = (x: number, y: number, out = 0) => Math.sqrt(Math.max(0, R * R - x * x - y * y)) + out;
  const ball = (x: number, y: number, z: number, r: number, c: RGB) => { p.push(); p.translate(x, y, z); setMat(c); p.sphere(r, 14, 11); p.pop(); };

  const a = hexToRgb(genome.couleurA), b = hexToRgb(genome.couleurB);
  const core = tint(a, 0.5);
  const cMain = vivid(a, 0.3, 0.02), cAlt = vivid(b, 0.3, 0.02);
  const cShoe = vivid(rotateHue(b, 200), 0.25, 0.05), cSole = vivid(rotateHue(a, 330), 0.25, 0.08);
  const shape = genome.forme != null ? genome.forme : petal3DStyle(genome.seedHash);

  const rnd = prngFromHex(genome.seedHash);
  const vars: { len: number; wid: number; hue: number; tilt: number }[] = [];
  for (let i = 0; i < 12; i++) vars.push({ len: 1 + (rnd() - 0.5) * 0.24, wid: 1 + (rnd() - 0.5) * 0.24, hue: (rnd() - 0.5) * 0.5, tilt: 0.16 + rnd() * 0.22 });

  // Pose from the (optional) dance.
  const rig = computeRig(dance, t);
  const bobY = rig.bobY;
  const armL = rig.armL, armR = rig.armR;
  const headTilt = rig.headTilt;
  const spin = t * 0.45 * (genome.vitesse ?? 1);

  const petLen = R * 0.8, petW = R * 0.32, petThick = R * 0.28;

  const petalShape = (w: number, h: number, th: number) => {
    switch (shape) {
      case 1: p.ellipsoid(w * 1.1, h * 0.95, th * 1.1, 14, 10); break;
      case 2: p.push(); p.rotateZ(Math.PI / 4); p.box(w * 1.4, h * 1.4, th * 1.3); p.pop(); break;
      case 3: p.cylinder(w * 0.72, h * 1.6, 14, 1); p.push(); p.translate(0, -h * 0.8, 0); p.sphere(w * 0.72, 10, 8); p.pop(); p.push(); p.translate(0, h * 0.8, 0); p.sphere(w * 0.72, 10, 8); p.pop(); break;
      case 4: p.cone(w * 1.1, h * 1.9, 16, 1, true); break;
      case 5: p.torus(h * 0.5, w * 0.42, 18, 10); break;
      case 6: for (const yy of [-h * 0.65, 0, h * 0.65]) { p.push(); p.translate(0, yy, 0); p.sphere(w * 0.8, 10, 8); p.pop(); } break;
      default: p.ellipsoid(w, h, th, 16, 10);
    }
  };

  const drawHat = (type: string) => {
    if (!type || type === "none") return;
    if (type === "cap") {
      setMat([230, 70, 90]); p.push(); p.translate(0, -R * 0.82, 0); p.scale(1.15, 0.78, 1.15); p.sphere(R * 0.56, 22, 16); p.pop();
      setMat([205, 52, 72]); p.push(); p.translate(0, -R * 0.5, R * 0.62); p.rotateX(0.15); p.ellipsoid(R * 0.42, R * 0.06, R * 0.3, 16, 8); p.pop();
    } else if (type === "party") {
      setMat([232, 92, 200]); p.push(); p.translate(0, -R * 1.5, 0); p.rotateZ(Math.PI); p.cone(R * 0.42, R * 1.0, 20, 1, true); p.pop(); ball(0, -R * 2.02, 0, R * 0.11, [255, 240, 120]);
    } else if (type === "tophat") {
      setMat([40, 36, 48]); p.push(); p.translate(0, -R * 1.5, 0); p.cylinder(R * 0.46, R * 1.0, 22, 1); p.pop(); p.push(); p.translate(0, -R * 1.0, 0); p.cylinder(R * 0.78, R * 0.1, 26, 1); p.pop();
    } else if (type === "crown") {
      setMat([240, 195, 60]); p.push(); p.translate(0, -R * 0.78, 0); p.rotateX(Math.PI / 2); p.torus(R * 0.62, R * 0.1, 22, 10); p.pop();
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2; p.push(); p.translate(Math.cos(ang) * R * 0.62, -R * 0.92, Math.sin(ang) * R * 0.62); p.rotateZ(Math.PI); p.cone(R * 0.09, R * 0.26, 8, 1, true); p.pop(); }
    } else if (type === "beret") {
      setMat([60, 70, 140]); p.push(); p.translate(0, -R * 0.92, -R * 0.04); p.rotateX(-0.18); p.scale(1.25, 0.34, 1.25); p.sphere(R * 0.6, 22, 14); p.pop(); ball(0, -R * 1.12, -R * 0.04, R * 0.06, [60, 70, 140]);
    }
  };

  const drawGlasses = (type: string) => {
    if (!type || type === "none") return;
    const ey = -R * 0.05, ex = R * 0.3, lensZ = surfZ(ex, ey, R * 0.05), bridgeZ = surfZ(0, ey, R * 0.05);
    const dark: RGB = [22, 20, 30];
    const bridge = (col: RGB, w: number) => { p.push(); p.translate(0, ey, bridgeZ); setMat(col, 120, 40); p.box(w, R * 0.04, R * 0.05); p.pop(); };
    if (type === "sun" || type === "thug") {
      const box = type === "thug";
      for (const sx of [-1, 1]) { p.push(); p.translate(sx * ex, ey, lensZ); setMat(dark, 220, 90); if (box) p.box(R * 0.3, R * 0.2, R * 0.05); else p.ellipsoid(R * 0.17, R * 0.13, R * 0.04, 16, 12); p.pop(); }
      bridge(dark, R * 0.2);
    } else if (type === "round") {
      for (const sx of [-1, 1]) { p.push(); p.translate(sx * ex, ey, lensZ); setMat(dark); p.torus(R * 0.14, R * 0.028, 18, 10); p.pop(); } bridge(dark, R * 0.14);
    } else if (type === "heart") {
      for (const sx of [-1, 1]) { p.push(); p.translate(sx * ex, ey, lensZ); setMat([255, 80, 130], 160, 50); p.torus(R * 0.14, R * 0.04, 18, 10); p.pop(); } bridge([255, 80, 130], R * 0.12);
    } else if (type === "star") {
      for (const sx of [-1, 1]) { p.push(); p.translate(sx * ex, ey, lensZ); setMat([255, 214, 70], 180, 60); p.push(); p.box(R * 0.26, R * 0.06, R * 0.05); p.pop(); p.push(); p.box(R * 0.06, R * 0.26, R * 0.05); p.pop(); p.pop(); } bridge([255, 214, 70], R * 0.12);
    }
  };

  const drawShoe = (fx: number, fy: number, type: string) => {
    const z = R * 0.16;
    switch (type) {
      case "boot": p.push(); p.translate(fx, fy - R * 0.1, z * 0.6); setMat(cShoe); p.ellipsoid(R * 0.42, R * 0.5, R * 0.5, 14, 10); p.pop(); p.push(); p.translate(fx, fy + R * 0.2, z); setMat(cSole); p.ellipsoid(R * 0.5, R * 0.14, R * 0.66, 14, 10); p.pop(); break;
      case "sandal": p.push(); p.translate(fx, fy + R * 0.16, z); setMat(cSole); p.ellipsoid(R * 0.46, R * 0.1, R * 0.6, 14, 10); p.pop(); p.push(); p.translate(fx, fy, z); setMat(cShoe); p.box(R * 0.5, R * 0.05, R * 0.12); p.pop(); break;
      case "platform": p.push(); p.translate(fx, fy, z); setMat(cShoe); p.ellipsoid(R * 0.5, R * 0.28, R * 0.6, 14, 10); p.pop(); p.push(); p.translate(fx, fy + R * 0.22, z); setMat(cSole); p.ellipsoid(R * 0.54, R * 0.26, R * 0.66, 14, 10); p.pop(); break;
      case "classic": p.push(); p.translate(fx, fy, z); setMat(cShoe); p.sphere(R * 0.42, 14, 10); p.pop(); p.push(); p.translate(fx, fy + R * 0.18, z); setMat(cSole); p.ellipsoid(R * 0.46, R * 0.12, R * 0.56, 14, 10); p.pop(); break;
      case "redhi": p.push(); p.translate(fx, fy - R * 0.12, z * 0.6); setMat([220, 50, 60]); p.ellipsoid(R * 0.4, R * 0.55, R * 0.48, 14, 10); p.pop(); p.push(); p.translate(fx, fy + R * 0.22, z); setMat([255, 255, 255]); p.ellipsoid(R * 0.5, R * 0.13, R * 0.64, 14, 10); p.pop(); break;
      default: p.push(); p.translate(fx, fy, z); setMat(cShoe); p.ellipsoid(R * 0.5, R * 0.3, R * 0.62, 14, 10); p.pop(); p.push(); p.translate(fx, fy + R * 0.18, z); setMat(cSole); p.ellipsoid(R * 0.52, R * 0.13, R * 0.64, 14, 10); p.pop();
    }
  };

  const drawFace = (mood: string) => {
    const dark: RGB = [40, 34, 48], blush: RGB = [255, 160, 185], nose: RGB = [255, 150, 175], white: RGB = [255, 255, 255];
    const blinking = (t % 3.4) < 0.14;
    const closedArc = (sx: number, sad = false) => {
      const offs: [number, number][] = sad ? [[-0.1, -0.02], [0, 0.02], [0.1, -0.02]] : [[-0.1, 0], [0, -0.03], [0.1, 0]];
      for (const [ox, oy] of offs) { const x = sx * R * 0.32 + ox * R, y = -R * 0.04 + oy * R; p.push(); p.translate(x, y, surfZ(x, y, R * 0.01)); setMat(dark, 15, 6); p.sphere(R * 0.05, 10, 8); p.pop(); }
    };
    const openEye = (sx: number) => {
      const x = sx * R * 0.34, y = -R * 0.05;
      p.push(); p.translate(x, y, surfZ(x, y, R * 0.01)); setMat(dark, 20, 8); p.scale(1, blinking ? 0.12 : 1, 1); p.sphere(R * 0.088, 14, 12); p.pop();
      if (!blinking) { const sxx = x - sx * R * 0.03, syy = y - R * 0.035; p.push(); p.translate(sxx, syy, surfZ(sxx, syy, R * 0.05)); setMat(white, 200, 90); p.sphere(R * 0.026, 8, 6); p.pop(); }
    };
    if (mood === "joyeuse") { openEye(-1); openEye(1); }
    else if (mood === "espiegle") { closedArc(-1); openEye(1); }
    else if (mood === "melancolique") { closedArc(-1, true); closedArc(1, true); }
    else { closedArc(-1); closedArc(1); }
    for (const sx of [-1, 1]) { const x = sx * R * 0.5, y = R * 0.14; p.push(); p.translate(x, y, surfZ(x, y)); setMat(blush, 25, 6); p.ellipsoid(R * 0.14, R * 0.09, R * 0.05, 14, 8); p.pop(); }
    { const x = 0, y = R * 0.04; p.push(); p.translate(x, y, surfZ(x, y, R * 0.02)); setMat(nose, 40, 12); p.sphere(R * 0.05, 12, 10); p.pop(); }
    const mouth: [number, number, number][] = [];
    const add = (x: number, y: number, r: number) => mouth.push([x, y, r]);
    if (mood === "joyeuse") for (let k = -3; k <= 3; k++) add(k * R * 0.05, R * 0.2 + Math.abs(k) * R * 0.03, R * 0.045);
    else if (mood === "espiegle") { add(-R * 0.09, R * 0.2, R * 0.045); add(-R * 0.03, R * 0.24, R * 0.045); add(R * 0.03, R * 0.24, R * 0.045); add(R * 0.09, R * 0.2, R * 0.045); }
    else if (mood === "melancolique") for (let k = -2; k <= 2; k++) add(k * R * 0.055, R * 0.27 - Math.abs(k) * R * 0.025, R * 0.04);
    else for (let k = -2; k <= 2; k++) add(k * R * 0.05, R * 0.21 + Math.abs(k) * R * 0.02, R * 0.04);
    for (const [mx, my, mr] of mouth) { p.push(); p.translate(mx, my, surfZ(mx, my, R * 0.01)); setMat(dark, 15, 6); p.sphere(mr, 10, 8); p.pop(); }
  };

  const n = genome.petales;

  // ── Low-detail version (far flowers in the metaverse) ──
  if (lod >= 1) {
    p.push();
    p.translate(0, bobY * R, 0);
    p.push(); p.translate(0, -R * 0.1, R * 0.35); p.rotateZ(spin);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2; const v = vars[i % 12];
      setMat(tint(lerpRgb(a, b, i / Math.max(1, n)), 0.06), 70, 12);
      p.push(); p.rotateZ(ang); p.translate(0, -(R * 0.95 + petLen * v.len), 0); p.rotateX(-v.tilt);
      p.ellipsoid(petW * v.wid, petLen * v.len, petThick, 8, 6); p.pop();
    }
    p.pop();
    setMat(core, 50, 12); p.push(); p.sphere(R, 16, 12); p.pop();
    for (const sx of [-1, 1]) { const x = sx * R * 0.32, y = -R * 0.04; p.push(); p.translate(x, y, surfZ(x, y, R * 0.01)); setMat([45, 38, 52], 15, 6); p.sphere(R * 0.07, 8, 6); p.pop(); }
    ball(0, R * 1.1, 0, R * 0.34, cMain);
    ball(0, R * 1.7, 0, R * 0.34, cAlt);
    ball(0, R * 2.3, 0, R * 0.3, cMain);
    p.pop();
    return;
  }

  // ── Compose (full) ──
  p.push();
  p.translate(rig.sway * R, bobY * R, 0);
  p.rotateY(rig.spin + rig.twist);

  // Petals (just in front of the body).
  p.push();
  p.translate(0, -R * 0.1, R * 0.35);
  p.rotateZ(spin);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2; const v = vars[i % 12];
    setMat(tint(rotateHue(vivid(lerpRgb(a, b, i / Math.max(1, n)), 0.3, 0.02), v.hue * 40), 0.04), 80, 16);
    p.push(); p.rotateZ(ang); p.translate(0, -(R * 0.95 + petLen * v.len), 0); p.rotateX(-v.tilt);
    petalShape(petW * v.wid, petLen * v.len, petThick); p.pop();
  }
  p.pop();

  // Head + face + accessories.
  p.push(); p.rotateZ(headTilt);
  setMat(core, 55, 16); p.push(); p.sphere(R, 34, 26); p.pop();
  drawFace(genome.humeur);
  drawHat(genome.chapeau ?? "none");
  drawGlasses(genome.lunettes ?? "none");
  p.pop();

  // Detached bead body.
  ball(0, R * 1.0, 0, R * 0.3, cAlt);
  ball(0, R * 1.5, 0, R * 0.36, cMain);
  ball(0, R * 2.05, 0, R * 0.36, cMain);
  ball(0, R * 2.55, 0, R * 0.32, cAlt);
  for (const sx of [-1, 1]) {
    ball(sx * R * 0.5, R * 1.4, 0, R * 0.3, cMain);
    const aAng = sx > 0 ? armR : armL;
    const shX = sx * R * 0.5, shY = R * 1.4;
    const arm: [number, RGB][] = [[0.28, cAlt], [0.26, cMain], [0.24, cAlt]];
    for (let k = 0; k < arm.length; k++) { const dist = (k + 1) * R * 0.55; ball(shX + sx * Math.sin(aAng) * dist, shY + Math.cos(aAng) * dist - (k + 1) * R * 0.02, 0, R * arm[k][0], arm[k][1]); }
    const hipX = sx * R * 0.26, hipY = R * 2.75; const legLen = R * 0.55 * (1 - rig.legLift * 0.55); let fy = hipY;
    const leg: [number, RGB][] = [[0.32, cMain], [0.28, cAlt]];
    for (let k = 0; k < leg.length; k++) { fy = hipY + (k + 1) * legLen; ball(hipX, fy, 0, R * leg[k][0], leg[k][1]); }
    drawShoe(hipX, fy + R * 0.35, genome.chaussures ?? "sneaker");
  }
  p.pop();
}

/** Approx. height of a character below the head origin (feet distance). */
export const CHAR_FOOT = 3.9; // in units of R
