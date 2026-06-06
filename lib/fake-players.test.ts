import { describe, expect, it } from "vitest";
import { PLAYER_FLOWERS } from "./fake-players";
import { GenomeSchema } from "./genome";

describe("PLAYER_FLOWERS", () => {
  it("has 70 listed flowers", () => {
    expect(PLAYER_FLOWERS).toHaveLength(70);
    expect(PLAYER_FLOWERS.every((f) => f.listed)).toBe(true);
  });

  it("has unique ids and handles", () => {
    expect(new Set(PLAYER_FLOWERS.map((f) => f.id)).size).toBe(70);
    expect(new Set(PLAYER_FLOWERS.map((f) => f.owner)).size).toBe(70);
  });

  it("every flower has a valid genome (with accessories)", () => {
    for (const f of PLAYER_FLOWERS) {
      expect(GenomeSchema.safeParse(f.genome).success).toBe(true);
    }
  });

  it("prices are positive", () => {
    expect(PLAYER_FLOWERS.every((f) => f.price > 0)).toBe(true);
  });
});
