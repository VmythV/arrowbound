import { describe, expect, it } from "vitest";
import {
  computeCoinValue,
  manualCoinMultiplier,
  robotCoinMultiplier,
  type CoinIncomeContext,
} from "../game/systems/coin-income";

function context(overrides: Partial<CoinIncomeContext> = {}): CoinIncomeContext {
  return {
    greedyCoinLevel: 0,
    robotGreedLevel: 0,
    allCoinMultiplier: 1,
    tenRingMultiplier: 1,
    ...overrides,
  };
}

describe("coin income multipliers", () => {
  it("scales the manual multiplier by 0.1 per greedy-coin level", () => {
    expect(manualCoinMultiplier(0)).toBe(1);
    expect(manualCoinMultiplier(5)).toBeCloseTo(1.5, 10);
  });

  it("uses the 0.7 robot base scaled by 0.08 per robot-greed level", () => {
    expect(robotCoinMultiplier(0)).toBeCloseTo(0.7, 10);
    expect(robotCoinMultiplier(5)).toBeCloseTo(0.98, 10);
  });
});

describe("computeCoinValue", () => {
  it("produces no coins on a miss", () => {
    expect(computeCoinValue(0, "player", context())).toBe(0);
    expect(computeCoinValue(0, "robot", context())).toBe(0);
  });

  it("floors manual value using the greedy multiplier", () => {
    expect(computeCoinValue(10, "player", context())).toBe(10);
    expect(computeCoinValue(10, "player", context({ greedyCoinLevel: 5 }))).toBe(15);
    expect(computeCoinValue(7, "player", context({ greedyCoinLevel: 3 }))).toBe(9); // 7×1.3=9.1
  });

  it("floors robot value using the robot multiplier and never mixes with the manual one", () => {
    expect(computeCoinValue(10, "robot", context())).toBe(7); // 10×0.7
    expect(computeCoinValue(10, "robot", context({ robotGreedLevel: 5 }))).toBe(9); // 10×0.98
    // 玩家等级不影响机器人收益，反之亦然。
    expect(computeCoinValue(10, "robot", context({ greedyCoinLevel: 20 }))).toBe(7);
    expect(computeCoinValue(10, "player", context({ robotGreedLevel: 20 }))).toBe(10);
  });

  it("guarantees at least one coin for any hit", () => {
    expect(computeCoinValue(1, "robot", context())).toBe(1); // floor(0.7)=0 → 1
    expect(computeCoinValue(1, "player", context())).toBe(1);
  });

  it("applies the all-coin blessing multiplier to both sources", () => {
    expect(computeCoinValue(5, "player", context({ allCoinMultiplier: 1.3 }))).toBe(6); // floor(6.5)
    expect(computeCoinValue(10, "robot", context({ allCoinMultiplier: 1.3 }))).toBe(9); // floor(9.1)
  });

  it("applies the ten-ring blessing multiplier only to the ten ring", () => {
    expect(computeCoinValue(10, "player", context({ tenRingMultiplier: 2 }))).toBe(20);
    expect(computeCoinValue(9, "player", context({ tenRingMultiplier: 2 }))).toBe(9);
  });

  it("stacks blessings in the documented order for a ten ring", () => {
    // 10 × (1+0.1×5) × 1.3 × 2 = 39
    expect(
      computeCoinValue(
        10,
        "player",
        context({ greedyCoinLevel: 5, allCoinMultiplier: 1.3, tenRingMultiplier: 2 }),
      ),
    ).toBe(39);
  });

  it("rejects invalid rings", () => {
    expect(() => computeCoinValue(11, "player", context())).toThrow(RangeError);
    expect(() => computeCoinValue(1.5, "player", context())).toThrow(RangeError);
    expect(() => computeCoinValue(-1, "player", context())).toThrow(RangeError);
  });
});
