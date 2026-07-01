import { describe, expect, it } from "vitest";
import { COIN_TIER_VISUALS, resolveCoinTier, type CoinTier } from "../game/config/coin.config";

describe("resolveCoinTier", () => {
  it("maps values to tiers at the documented thresholds", () => {
    const cases: ReadonlyArray<readonly [number, CoinTier]> = [
      [1, "small"],
      [2, "small"],
      [3, "normal"],
      [7, "normal"],
      [8, "large"],
      [19, "large"],
      [20, "bag"],
      [59, "bag"],
      [60, "glowing"],
      [1000, "glowing"],
    ];
    for (const [value, tier] of cases) {
      expect(resolveCoinTier(value).tier, `value ${value}`).toBe(tier);
    }
  });

  it("falls back to the smallest tier below the minimum threshold", () => {
    expect(resolveCoinTier(0).tier).toBe("small");
  });

  it("keeps the tier table sorted with a monotonic value-to-strength relation", () => {
    for (let i = 1; i < COIN_TIER_VISUALS.length; i += 1) {
      const previous = COIN_TIER_VISUALS[i - 1];
      const current = COIN_TIER_VISUALS[i];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (previous === undefined || current === undefined) {
        continue;
      }
      expect(current.minValue).toBeGreaterThan(previous.minValue);
      expect(current.scale).toBeGreaterThanOrEqual(previous.scale);
    }
  });

  it("rejects non-finite values", () => {
    expect(() => resolveCoinTier(Number.NaN)).toThrow(RangeError);
  });
});
