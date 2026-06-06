import { describe, expect, it } from "vitest";
import { feedFlower, croiser } from "./actions";
import { GenomeSchema, genomeDefaut, PETALES_MAX, PETALES_MIN } from "./genome";

const A = genomeDefaut(10, "0xabc123abc123abc123abc123abc123abc123abc1");
const B = {
  ...genomeDefaut(20, "0xdef456def456def456def456def456def456def4"),
  petales: 9,
  couleurA: "#00ff88",
  couleurB: "#0077ff",
  humeur: "joyeuse" as const,
};

describe("feedFlower", () => {
  it("water grows a petal (clamped)", () => {
    const fed = feedFlower({ ...A, petales: 5 }, "eau");
    expect(fed.petales).toBe(6);
    expect(GenomeSchema.safeParse(fed).success).toBe(true);
  });

  it("never exceeds the petal bounds", () => {
    const max = feedFlower({ ...A, petales: PETALES_MAX }, "eau");
    expect(max.petales).toBeLessThanOrEqual(PETALES_MAX);
    expect(max.petales).toBeGreaterThanOrEqual(PETALES_MIN);
  });

  it("fertilizer keeps colours as valid hex", () => {
    const fed = feedFlower(A, "engrais");
    expect(fed.couleurA).toMatch(/^#[0-9a-f]{6}$/);
    expect(fed.couleurB).toMatch(/^#[0-9a-f]{6}$/);
    expect(GenomeSchema.safeParse(fed).success).toBe(true);
  });

  it("every action yields a schema-valid genome", () => {
    for (const action of ["eau", "engrais", "soleil", "pouvoir"] as const) {
      expect(GenomeSchema.safeParse(feedFlower(B, action)).success).toBe(true);
    }
  });
});

describe("croiser (breeding)", () => {
  it("is deterministic for a given pair", () => {
    expect(croiser(A, B)).toEqual(croiser(A, B));
  });

  it("produces a schema-valid child", () => {
    const child = croiser(A, B);
    expect(GenomeSchema.safeParse(child).success).toBe(true);
    expect(child.seedHash).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it("child petals stay within bounds", () => {
    const child = croiser(A, B);
    expect(child.petales).toBeGreaterThanOrEqual(PETALES_MIN);
    expect(child.petales).toBeLessThanOrEqual(PETALES_MAX);
  });

  it("different pairs give different children", () => {
    const C = { ...B, seedHash: "0x999888777666555444333222111000fedcba9876" };
    expect(croiser(A, B).seedHash).not.toBe(croiser(A, C).seedHash);
  });
});
