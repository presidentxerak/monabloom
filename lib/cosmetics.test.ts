import { describe, expect, it } from "vitest";
import { applyDelta, DeltaSchema, GenomeSchema, genomeDefaut } from "./genome";

const base = genomeDefaut(1, "0xabc");

describe("accessory + shape deltas", () => {
  it("DeltaSchema accepts valid cosmetics", () => {
    expect(DeltaSchema.safeParse({ chapeau: "crown" }).success).toBe(true);
    expect(DeltaSchema.safeParse({ lunettes: "thug" }).success).toBe(true);
    expect(DeltaSchema.safeParse({ chaussures: "boot" }).success).toBe(true);
    expect(DeltaSchema.safeParse({ forme: 4 }).success).toBe(true);
  });

  it("DeltaSchema rejects invalid cosmetics", () => {
    expect(DeltaSchema.safeParse({ chapeau: "sombrero" }).success).toBe(false);
    expect(DeltaSchema.safeParse({ lunettes: "monocle" }).success).toBe(false);
    expect(DeltaSchema.safeParse({ forme: 99 }).success).toBe(false);
  });

  it("applyDelta sets cosmetics", () => {
    const g = applyDelta(base, {
      chapeau: "tophat",
      lunettes: "heart",
      chaussures: "platform",
      forme: 5,
    });
    expect(g.chapeau).toBe("tophat");
    expect(g.lunettes).toBe("heart");
    expect(g.chaussures).toBe("platform");
    expect(g.forme).toBe(5);
  });

  it("a genome with accessories validates", () => {
    const dressed = { ...base, chapeau: "beret", lunettes: "sun", chaussures: "redhi", forme: 2 };
    expect(GenomeSchema.safeParse(dressed).success).toBe(true);
  });
});
