import { describe, expect, it } from "vitest";
import { ROBOT_CONFIG } from "../game/config/robot.config";
import { computeCoinValue, type CoinIncomeContext } from "../game/systems/coin-income";
import { robotCountForLevel } from "../game/systems/ShopService";

const NEUTRAL: CoinIncomeContext = {
  greedyCoinLevel: 0,
  robotGreedLevel: 0,
  allCoinMultiplier: 1,
  tenRingMultiplier: 1,
};

function expectedRobotCoinsPerShot(context: CoinIncomeContext): number {
  const totalWeight = ROBOT_CONFIG.aimWeights.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedCoins = ROBOT_CONFIG.aimWeights.reduce(
    (sum, entry) => sum + entry.weight * computeCoinValue(entry.ring, "robot", context),
    0,
  );
  return weightedCoins / totalWeight;
}

describe("robot income balance", () => {
  it("keeps a manual ten ring worth about 3 to 5 robot shots at base stats", () => {
    const manualTen = computeCoinValue(10, "player", NEUTRAL);
    const robotAverage = expectedRobotCoinsPerShot(NEUTRAL);
    const ratio = manualTen / robotAverage;
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeLessThanOrEqual(5);
  });

  it("never rewards robots above the manual ten ring per shot", () => {
    // 机器人平均单箭收益应明显低于玩家手动十环。
    expect(expectedRobotCoinsPerShot(NEUTRAL)).toBeLessThan(computeCoinValue(10, "player", NEUTRAL));
  });

  it("produces no robots until the machine archer upgrade is bought", () => {
    expect(robotCountForLevel(0)).toBe(0);
    expect(robotCountForLevel(1)).toBeGreaterThan(0);
  });
});
