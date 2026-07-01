import { describe, expect, it } from "vitest";
import { RandomService } from "../game/utils/random";

describe("RandomService", () => {
  it("repeats the same sequence for the same seed", () => {
    const first = new RandomService("arrowbound-test");
    const second = new RandomService("arrowbound-test");
    expect(Array.from({ length: 8 }, () => first.next())).toEqual(
      Array.from({ length: 8 }, () => second.next()),
    );
  });

  it("samples weighted choices without duplicates", () => {
    const random = new RandomService(42);
    const sample = random.weightedSampleWithoutReplacement(
      [
        { value: "a", weight: 1 },
        { value: "b", weight: 2 },
        { value: "c", weight: 3 },
      ],
      3,
    );
    expect(new Set(sample).size).toBe(3);
  });
});
