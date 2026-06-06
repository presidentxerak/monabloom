import { describe, expect, it } from "vitest";
import {
  gradientAt,
  hexToRgb,
  petalOutline,
  petalVariations,
} from "./flower-engine";
import { prngFromHex } from "./prng";

describe("hexToRgb", () => {
  it("parses #rrggbb", () => {
    expect(hexToRgb("#ff6ec7")).toEqual([255, 110, 199]);
  });
});

describe("prng determinism", () => {
  it("same hex => same sequence", () => {
    const a = prngFromHex("0xdeadbeef");
    const b = prngFromHex("0xdeadbeef");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("different hex => different sequence", () => {
    const a = prngFromHex("0xdead");
    const b = prngFromHex("0xbeef");
    expect(a()).not.toEqual(b());
  });
});

describe("petalVariations", () => {
  it("is deterministic for a given seed", () => {
    expect(petalVariations("0xabc")).toEqual(petalVariations("0xabc"));
  });
  it("stays within ±8%", () => {
    for (const v of petalVariations("0xabc")) {
      expect(v.lengthFactor).toBeGreaterThanOrEqual(0.92);
      expect(v.lengthFactor).toBeLessThanOrEqual(1.08);
      expect(v.widthFactor).toBeGreaterThanOrEqual(0.92);
      expect(v.widthFactor).toBeLessThanOrEqual(1.08);
    }
  });
});

describe("petalOutline", () => {
  it("produces a closed-ish loop starting and returning near the centre", () => {
    const pts = petalOutline(100, 40);
    expect(pts.length).toBe(40);
    expect(pts[0].x).toBeCloseTo(0);
    expect(pts[0].y).toBeCloseTo(0);
  });
});

describe("gradientAt (looping)", () => {
  it("ping-pongs so the seam matches", () => {
    const a: [number, number, number] = [0, 0, 0];
    const b: [number, number, number] = [255, 255, 255];
    expect(gradientAt(a, b, 0)).toEqual(gradientAt(a, b, 1));
  });
});
