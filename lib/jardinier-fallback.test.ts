import { describe, expect, it } from "vitest";
import { ruleBasedResponse } from "./jardinier-fallback";

describe("ruleBasedResponse — commands map to exact changes", () => {
  it("colours", () => {
    expect(ruleBasedResponse("make her blue").changes.couleurB).toBe("#2a55ff");
    expect(ruleBasedResponse("turn it red").changes.couleurA).toBe("#ff2244");
    expect(ruleBasedResponse("paint it green").changes.couleurA).toBe("#22cc77");
    expect(ruleBasedResponse("give her a yellow glow").changes.couleurA).toBe("#ffe000");
  });

  it("petals", () => {
    expect(ruleBasedResponse("more petals please").changes.petales).toBe("+2");
    expect(ruleBasedResponse("fewer petals").changes.petales).toBe("-2");
    expect(ruleBasedResponse("9 petals").changes.petales).toBe(9);
  });

  it("moods", () => {
    expect(ruleBasedResponse("make her happy").changes.humeur).toBe("joyeuse");
    expect(ruleBasedResponse("she looks sad").changes.humeur).toBe("melancolique");
    expect(ruleBasedResponse("be calm").changes.humeur).toBe("sereine");
  });

  it("accessories", () => {
    expect(ruleBasedResponse("give her sunglasses").changes.lunettes).toBe("sun");
    expect(ruleBasedResponse("thug life").changes.lunettes).toBe("thug");
    expect(ruleBasedResponse("put a top hat on her").changes.chapeau).toBe("tophat");
    expect(ruleBasedResponse("a crown").changes.chapeau).toBe("crown");
    expect(ruleBasedResponse("give her boots").changes.chaussures).toBe("boot");
  });

  it("petal shapes", () => {
    expect(ruleBasedResponse("diamond petals").changes.forme).toBe(2);
    expect(ruleBasedResponse("pointed petals").changes.forme).toBe(4);
    expect(ruleBasedResponse("ring petals").changes.forme).toBe(5);
  });

  it("does NOT change anything on unrelated text (no spurious changes)", () => {
    expect(ruleBasedResponse("what is your name?").changes).toEqual({});
    expect(ruleBasedResponse("hello there").changes).toEqual({});
  });

  it("'what' does not trigger a hat", () => {
    expect(ruleBasedResponse("what color is she?").changes.chapeau).toBeUndefined();
  });

  it("understands looser synonyms", () => {
    expect(ruleBasedResponse("make her smile").changes.humeur).toBe("joyeuse");
    expect(ruleBasedResponse("she looks gloomy").changes.humeur).toBe("melancolique");
    expect(ruleBasedResponse("chill vibes").changes.humeur).toBe("sereine");
    expect(ruleBasedResponse("add more petals").changes.petales).toBe("+2");
  });

  it("controls spin speed and size", () => {
    expect(ruleBasedResponse("spin faster").changes.vitesse).toBeGreaterThan(1);
    expect(ruleBasedResponse("accelerate petals rotation").changes.vitesse).toBeGreaterThan(1);
    expect(ruleBasedResponse("slow down the spin").changes.vitesse).toBeLessThan(1);
    expect(ruleBasedResponse("make her huge").changes.taille).toBeGreaterThan(1);
    expect(ruleBasedResponse("make it tiny").changes.taille).toBeLessThan(1);
  });

  it("flags confident matches vs guesses", () => {
    expect(ruleBasedResponse("make her blue").confident).toBe(true);
    expect(ruleBasedResponse("change petals").confident).toBe(false);
    expect(ruleBasedResponse("hello").confident).toBe(false);
  });

  it("vague 'change <target>' commands always do something", () => {
    expect(ruleBasedResponse("change petals").changes.petales).toBeDefined();

    const shape = ruleBasedResponse("change petals shape").changes;
    expect(shape.forme).toBeGreaterThanOrEqual(0);
    expect(shape.forme).toBeLessThanOrEqual(6);

    expect(ruleBasedResponse("change the shape").changes.forme).toBeDefined();
    expect(ruleBasedResponse("randomize the colors").changes.couleurA).toBeDefined();
    expect(ruleBasedResponse("change her mood").changes.humeur).toBeDefined();

    const all = ruleBasedResponse("surprise me").changes;
    expect(all.couleurA).toBeDefined();
    expect(all.humeur).toBeDefined();
  });
});
