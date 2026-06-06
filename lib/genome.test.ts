import { describe, expect, it } from "vitest";
import {
  applyDelta,
  clampPetales,
  DeltaSchema,
  genomeDefaut,
  parseJardinierReply,
  resolvePetales,
  type Genome,
} from "./genome";

const base: Genome = genomeDefaut(100, "0xabc123");

describe("clampPetales", () => {
  it("clamps below the minimum", () => {
    expect(clampPetales(1)).toBe(3);
  });
  it("clamps above the maximum", () => {
    expect(clampPetales(99)).toBe(12);
  });
  it("rounds floats", () => {
    expect(clampPetales(5.6)).toBe(6);
  });
  it("falls back to min on NaN", () => {
    expect(clampPetales(NaN)).toBe(3);
  });
});

describe("resolvePetales", () => {
  it("handles absolute numbers", () => {
    expect(resolvePetales(5, 8)).toBe(8);
  });
  it("handles relative +n", () => {
    expect(resolvePetales(5, "+3")).toBe(8);
  });
  it("handles relative -n", () => {
    expect(resolvePetales(5, "-1")).toBe(4);
  });
  it("clamps relative overflow high", () => {
    expect(resolvePetales(10, "+20")).toBe(12);
  });
  it("clamps relative overflow low", () => {
    expect(resolvePetales(4, "-10")).toBe(3);
  });
  it("keeps current when delta undefined", () => {
    expect(resolvePetales(7, undefined)).toBe(7);
  });
});

describe("applyDelta — petales bounds", () => {
  it("clamps an over-high absolute request", () => {
    expect(applyDelta(base, { petales: 50 }).petales).toBe(12);
  });
  it("clamps an over-low absolute request", () => {
    expect(applyDelta(base, { petales: 0 }).petales).toBe(3);
  });
  it("applies a valid relative delta", () => {
    expect(applyDelta({ ...base, petales: 5 }, { petales: "+2" }).petales).toBe(
      7,
    );
  });
});

describe("applyDelta — colours", () => {
  it("accepts a valid hex and lowercases it", () => {
    expect(applyDelta(base, { couleurA: "#AABBCC" }).couleurA).toBe("#aabbcc");
  });
  it("rejects an invalid hex (genome unchanged)", () => {
    // DeltaSchema would normally reject this; applyDelta also guards defensively.
    const dirty = { couleurA: "blue" } as unknown as { couleurA: string };
    expect(applyDelta(base, dirty).couleurA).toBe(base.couleurA);
  });
});

describe("applyDelta — humeur", () => {
  it("accepts a valid humeur", () => {
    expect(applyDelta(base, { humeur: "joyeuse" }).humeur).toBe("joyeuse");
  });
  it("ignores an out-of-list humeur", () => {
    const dirty = { humeur: "furieuse" } as unknown as {
      humeur: Genome["humeur"];
    };
    expect(applyDelta(base, dirty).humeur).toBe(base.humeur);
  });
});

describe("applyDelta — empty delta", () => {
  it("returns an equal genome", () => {
    expect(applyDelta(base, {})).toEqual(base);
  });
  it("does not mutate the original", () => {
    const copy = { ...base };
    applyDelta(base, { petales: 9 });
    expect(base).toEqual(copy);
  });
});

describe("DeltaSchema validation", () => {
  it("rejects unknown keys", () => {
    expect(DeltaSchema.safeParse({ wingspan: 5 }).success).toBe(false);
  });
  it("rejects invalid hex", () => {
    expect(DeltaSchema.safeParse({ couleurA: "#xyz" }).success).toBe(false);
  });
  it("rejects out-of-list humeur", () => {
    expect(DeltaSchema.safeParse({ humeur: "furieuse" }).success).toBe(false);
  });
  it("accepts a relative petales string", () => {
    expect(DeltaSchema.safeParse({ petales: "+2" }).success).toBe(true);
  });
  it("accepts an empty delta", () => {
    expect(DeltaSchema.safeParse({}).success).toBe(true);
  });
});

describe("parseJardinierReply", () => {
  it("parses a clean JSON object", () => {
    const r = parseJardinierReply('{"reply":"coucou","changes":{"humeur":"joyeuse"}}');
    expect(r?.reply).toBe("coucou");
    expect(r?.changes.humeur).toBe("joyeuse");
  });
  it("strips ```json fences", () => {
    const r = parseJardinierReply('```json\n{"reply":"hi","changes":{}}\n```');
    expect(r?.reply).toBe("hi");
  });
  it("salvages reply when changes are junk", () => {
    const r = parseJardinierReply('{"reply":"ok","changes":{"petales":"beaucoup"}}');
    expect(r?.reply).toBe("ok");
    expect(r?.changes).toEqual({});
  });
  it("returns null on total garbage", () => {
    expect(parseJardinierReply("not json at all")).toBeNull();
  });
  it("returns null on empty input", () => {
    expect(parseJardinierReply("")).toBeNull();
  });
});
