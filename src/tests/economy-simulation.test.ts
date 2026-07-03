import { describe, expect, it } from "vitest";
import { getLevelConfig } from "../game/config/level.config";
import { manualCoinMultiplier, robotCoinMultiplier } from "../game/systems/coin-income";

/**
 * 经济健康度自动化验证：无限流采用乘法复利倍率（贪婪金币/机械贪婪每级 ×1.10）+
 * 通关目标几何增长（×1.35）。这些用例守护调优意图，防止回归成"收入封顶 + 几何目标 = 早期撞墙"。
 */

describe("economy multipliers compound geometrically", () => {
  it("compounds the greedy-coin multiplier by a constant x1.1 per level", () => {
    expect(manualCoinMultiplier(1) / manualCoinMultiplier(0)).toBeCloseTo(1.1, 10);
    expect(manualCoinMultiplier(20) / manualCoinMultiplier(19)).toBeCloseTo(1.1, 10);
    // 复利意味着高等级收益远超线性叠加。
    expect(manualCoinMultiplier(30)).toBeGreaterThan(manualCoinMultiplier(0) + 0.1 * 30);
  });

  it("keeps the manual-to-robot multiplier ratio constant as both greeds scale together", () => {
    const ratio = (n: number): number => manualCoinMultiplier(n) / robotCoinMultiplier(n);
    expect(ratio(0)).toBeCloseTo(ratio(10), 6);
    expect(ratio(0)).toBeCloseTo(ratio(40), 6);
  });
});

describe("infinite economy stays playable well past the handcrafted levels", () => {
  it("lets a rational player keep clearing far beyond level 10 in bounded time", () => {
    // 近似理性玩家：满速手动（0.35s 冷却、平均 7 环）+ 5 个满配机器人被动收入；
    // 把盈余优先投入贪婪金币（主力乘法项），机械贪婪用同等级近似（两者同速率增长）。
    const COOLDOWN = 0.35;
    const AVG_MANUAL_RING = 7;
    const AVG_ROBOT_RING = 3.75;
    const ROBOT_COUNT = 5;
    const ROBOT_INTERVAL = 4 * 0.95 ** 20; // 满级机械连射
    const HORIZON_SECONDS = 3600; // 回本超过 1 小时则不再投资

    let greed = 0;
    let coins = 0;
    let seconds = 0;
    let level = 1;

    const gcCost = (lvl: number): number => Math.ceil(40 * 1.22 ** lvl);
    const income = (g: number): number => {
      const manual = (1 / COOLDOWN) * AVG_MANUAL_RING * manualCoinMultiplier(g);
      const robots = ROBOT_COUNT * (1 / ROBOT_INTERVAL) * AVG_ROBOT_RING * robotCoinMultiplier(g);
      return manual + robots;
    };

    const TARGET_LEVEL = 35;
    let guard = 0;
    while (level <= TARGET_LEVEL && guard < 5_000_000) {
      guard += 1;
      const goal = getLevelConfig(level)?.clearCoinGoal ?? Number.POSITIVE_INFINITY;
      if (coins >= goal) {
        coins -= goal;
        level += 1;
        continue;
      }
      const rate = income(greed);
      const cost = gcCost(greed);
      const gain = income(greed + 1) - rate;
      const worthBuying = gain > 0 && cost / gain < HORIZON_SECONDS;
      if (worthBuying && coins >= cost) {
        coins -= cost;
        greed += 1;
        continue;
      }
      // 攒钱：朝下一个目标（升级或通关）推进时间。
      const target = worthBuying ? cost : goal;
      const need = Math.max(0, target - coins);
      const dt = Math.max(0.05, need / rate);
      coins += rate * dt;
      seconds += dt;
    }

    // 未撞墙：能一路清到目标关卡，且累计耗时在合理范围（远小于当前加法方案的天文数字）。
    expect(level).toBeGreaterThan(TARGET_LEVEL);
    expect(Number.isFinite(seconds)).toBe(true);
    expect(seconds).toBeLessThan(50 * 3600); // 累计 < 50 小时
    // 收入确实随进程几何增长（复利生效）。
    expect(income(greed)).toBeGreaterThan(income(0) * 100);
  });
});
