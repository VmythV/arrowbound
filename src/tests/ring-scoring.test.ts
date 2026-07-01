import { describe, expect, it } from "vitest";
import { CENTER_RING_RATIO_CAP } from "../game/config/game.constants";
import {
  effectiveCenterRatio,
  effectiveTargetRadius,
  resolveRing,
  ringFromNormalizedDistance,
  type RingScoringConfig,
} from "../game/systems/ring-scoring";

function config(overrides: Partial<RingScoringConfig> = {}): RingScoringConfig {
  return {
    baseTargetRadius: 90,
    centerRingRatio: 0.1,
    preciseAimLevel: 0,
    centerBlessingMultiplier: 1,
    wideTargetMultiplier: 1,
    ...overrides,
  };
}

describe("ringFromNormalizedDistance ring bands", () => {
  it("gives every ring an equal 10% radial width when the center ratio is 10%", () => {
    // 环外边界依次为 0.1, 0.2, ..., 1.0，宽度恒为 0.1。
    const boundaries: ReadonlyArray<readonly [number, number]> = [
      [0.1, 10],
      [0.2, 9],
      [0.3, 8],
      [0.4, 7],
      [0.5, 6],
      [0.6, 5],
      [0.7, 4],
      [0.8, 3],
      [0.9, 2],
      [1.0, 1],
    ];
    for (const [distance, ring] of boundaries) {
      expect(ringFromNormalizedDistance(distance, 0.1)).toBe(ring);
    }
  });

  it("treats the inner boundary as excluded and the outer boundary as included", () => {
    // 0.2 属于 9 环（外边界包含），紧邻其上的点属于 8 环（内边界不含）。
    expect(ringFromNormalizedDistance(0.2, 0.1)).toBe(9);
    expect(ringFromNormalizedDistance(0.2000001, 0.1)).toBe(8);
    // 靶心内属于 10 环，靶心边界仍属于 10 环。
    expect(ringFromNormalizedDistance(0, 0.1)).toBe(10);
    expect(ringFromNormalizedDistance(0.1, 0.1)).toBe(10);
    expect(ringFromNormalizedDistance(0.1000001, 0.1)).toBe(9);
  });

  it("counts the exact target edge as ring 1 and anything beyond it as a miss", () => {
    expect(ringFromNormalizedDistance(1, 0.1)).toBe(1);
    expect(ringFromNormalizedDistance(1.0000001, 0.1)).toBe(0);
    expect(ringFromNormalizedDistance(2, 0.1)).toBe(0);
  });

  it("keeps the nine outer bands seamless with no overlap or gap when the center expands", () => {
    const centerRatio = 0.3;
    const width = (1 - centerRatio) / 9;
    // 相邻环的公共边界只归入内侧环，逐环推进不留缝隙。
    for (let k = 1; k <= 9; k += 1) {
      const outerBoundary = centerRatio + k * width;
      const ring = 10 - k;
      expect(ringFromNormalizedDistance(outerBoundary, centerRatio)).toBe(ring);
      if (k < 9) {
        expect(ringFromNormalizedDistance(outerBoundary + 1e-6, centerRatio)).toBe(ring - 1);
      }
    }
  });

  it("rejects invalid inputs", () => {
    expect(() => ringFromNormalizedDistance(-0.1, 0.1)).toThrow(RangeError);
    expect(() => ringFromNormalizedDistance(0.5, 0)).toThrow(RangeError);
    expect(() => ringFromNormalizedDistance(0.5, 1)).toThrow(RangeError);
  });
});

describe("effectiveCenterRatio", () => {
  it("adds one percentage point of ten-ring radius per precise-aim level", () => {
    expect(effectiveCenterRatio(config({ centerRingRatio: 0.1, preciseAimLevel: 5 }))).toBeCloseTo(
      0.15,
      10,
    );
  });

  it("applies the large-center blessing multiplier after the shop bonus", () => {
    // (0.1 + 0.01 × 3) × 1.2 = 0.156
    expect(
      effectiveCenterRatio(
        config({ centerRingRatio: 0.1, preciseAimLevel: 3, centerBlessingMultiplier: 1.2 }),
      ),
    ).toBeCloseTo(0.156, 10);
  });

  it("never lets the ten-ring radius exceed the 30% cap", () => {
    const ratio = effectiveCenterRatio(
      config({ centerRingRatio: 0.12, preciseAimLevel: 20, centerBlessingMultiplier: 1.2 }),
    );
    expect(ratio).toBe(CENTER_RING_RATIO_CAP);
    expect(ratio).toBeLessThanOrEqual(0.3);
  });
});

describe("effectiveTargetRadius", () => {
  it("keeps the base radius unchanged without the wide-target blessing", () => {
    expect(effectiveTargetRadius(config({ baseTargetRadius: 90 }))).toBe(90);
  });

  it("scales the total radius by the wide-target blessing multiplier", () => {
    expect(effectiveTargetRadius(config({ baseTargetRadius: 90, wideTargetMultiplier: 1.15 }))).toBeCloseTo(
      103.5,
      10,
    );
  });
});

describe("resolveRing pixel distances", () => {
  it("maps pixel distance from the center to the correct ring", () => {
    const scoring = config({ baseTargetRadius: 100, centerRingRatio: 0.1 });
    expect(resolveRing(0, scoring)).toEqual({ hit: true, ring: 10 });
    expect(resolveRing(10, scoring)).toEqual({ hit: true, ring: 10 });
    expect(resolveRing(55, scoring)).toEqual({ hit: true, ring: 5 });
    expect(resolveRing(100, scoring)).toEqual({ hit: true, ring: 1 });
    expect(resolveRing(120, scoring)).toEqual({ hit: false, ring: 0 });
  });

  it("expands the ten-ring reach without changing the target radius when the center grows", () => {
    // 十环扩大后，靶子外边界（半径）不变，仍在 1 环内，脱靶边界不变。
    const scoring = config({ baseTargetRadius: 100, centerRingRatio: 0.1, preciseAimLevel: 20 });
    expect(effectiveTargetRadius(scoring)).toBe(100);
    expect(effectiveCenterRatio(scoring)).toBeCloseTo(0.3, 10);
    expect(resolveRing(30, scoring)).toEqual({ hit: true, ring: 10 });
    expect(resolveRing(30.1, scoring)).toEqual({ hit: true, ring: 9 });
    expect(resolveRing(100, scoring)).toEqual({ hit: true, ring: 1 });
    expect(resolveRing(100.1, scoring)).toEqual({ hit: false, ring: 0 });
  });
});
