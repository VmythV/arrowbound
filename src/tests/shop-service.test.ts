import { describe, expect, it } from "vitest";
import type { ShopSaveData } from "../game/state/SaveData";
import {
  ShopService,
  robotCountForLevel,
  shotCooldownForLevel,
} from "../game/systems/ShopService";

const NONE_CLEARED = { isNormalCleared: () => false };

function shopWith(overrides: Partial<ShopSaveData> = {}): ShopService {
  return new ShopService({
    preciseAimLevel: 0,
    greedyCoinLevel: 0,
    quickDrawLevel: 0,
    robotArcherLevel: 0,
    robotRapidFireLevel: 0,
    robotGreedLevel: 0,
    coinPetLevel: 0,
    ...overrides,
  });
}

describe("robotCountForLevel", () => {
  it("follows the documented brackets and caps at five", () => {
    expect(robotCountForLevel(0)).toBe(0);
    expect(robotCountForLevel(1)).toBe(1);
    expect(robotCountForLevel(4)).toBe(1);
    expect(robotCountForLevel(5)).toBe(2);
    expect(robotCountForLevel(9)).toBe(2);
    expect(robotCountForLevel(10)).toBe(3);
    expect(robotCountForLevel(19)).toBe(4);
    expect(robotCountForLevel(20)).toBe(5);
    expect(robotCountForLevel(999)).toBe(5);
  });
});

describe("shotCooldownForLevel", () => {
  it("drops 0.04s per level but never below the 0.35s floor", () => {
    expect(shotCooldownForLevel(0)).toBeCloseTo(1.2, 10);
    expect(shotCooldownForLevel(5)).toBeCloseTo(1.0, 10);
    expect(shotCooldownForLevel(21)).toBeCloseTo(0.36, 10);
    expect(shotCooldownForLevel(22)).toBe(0.35);
    expect(shotCooldownForLevel(30)).toBe(0.35);
  });
});

describe("ShopService cost", () => {
  it("uses ceil(baseCost × costMultiplier ^ level)", () => {
    const shop = shopWith();
    expect(shop.getCost("precise_aim")).toBe(30);
    expect(shop.getCost("greedy_coin")).toBe(40);

    const leveled = shopWith({ preciseAimLevel: 1, greedyCoinLevel: 2 });
    expect(leveled.getCost("precise_aim")).toBe(37); // ceil(30 × 1.22)
    expect(leveled.getCost("greedy_coin")).toBe(60); // ceil(40 × 1.22^2)
  });

  it("reports maxed items with no cost", () => {
    const shop = shopWith({ preciseAimLevel: 20 });
    expect(shop.isMaxed("precise_aim")).toBe(true);
    expect(shop.getCost("precise_aim")).toBeUndefined();
  });
});

describe("ShopService unlock tree", () => {
  it("keeps the base items always unlocked", () => {
    const shop = shopWith();
    expect(shop.isUnlocked("precise_aim", NONE_CLEARED)).toBe(true);
    expect(shop.isUnlocked("greedy_coin", NONE_CLEARED)).toBe(true);
    expect(shop.isUnlocked("quick_draw", NONE_CLEARED)).toBe(false);
    expect(shop.isUnlocked("robot_archer", NONE_CLEARED)).toBe(false);
  });

  it("unlocks items when their prerequisite item levels are met", () => {
    expect(shopWith({ preciseAimLevel: 3 }).isUnlocked("quick_draw", NONE_CLEARED)).toBe(true);
    expect(shopWith({ greedyCoinLevel: 5 }).isUnlocked("robot_archer", NONE_CLEARED)).toBe(true);
    expect(shopWith({ robotArcherLevel: 3 }).isUnlocked("robot_rapid_fire", NONE_CLEARED)).toBe(true);
    expect(shopWith({ robotArcherLevel: 5 }).isUnlocked("robot_greed", NONE_CLEARED)).toBe(true);
  });

  it("unlocks the coin pet via greedy coin level or clearing level 5", () => {
    expect(shopWith({ greedyCoinLevel: 8 }).isUnlocked("coin_pet", NONE_CLEARED)).toBe(true);
    expect(shopWith().isUnlocked("coin_pet", NONE_CLEARED)).toBe(false);
    expect(shopWith().isUnlocked("coin_pet", { isNormalCleared: (id) => id === 5 })).toBe(true);
  });
});

describe("ShopService tryPurchase", () => {
  it("rejects locked and maxed items without spending", () => {
    const shop = shopWith();
    let spent = 0;
    const spend = (cost: number) => {
      spent += cost;
      return true;
    };
    expect(shop.tryPurchase("quick_draw", NONE_CLEARED, spend).status).toBe("locked");

    const maxed = shopWith({ preciseAimLevel: 20 });
    expect(maxed.tryPurchase("precise_aim", NONE_CLEARED, spend).status).toBe("maxed");
    expect(spent).toBe(0);
  });

  it("does not level up when the wallet cannot cover the cost", () => {
    const shop = shopWith();
    const result = shop.tryPurchase("precise_aim", NONE_CLEARED, () => false);
    expect(result.status).toBe("insufficient");
    expect(result.cost).toBe(30);
    expect(shop.getLevel("precise_aim")).toBe(0);
  });

  it("spends the cost, raises the level, and reports newly unlocked items", () => {
    const shop = shopWith({ preciseAimLevel: 2 });
    let spent = 0;
    const result = shop.tryPurchase("precise_aim", NONE_CLEARED, (cost) => {
      spent = cost;
      return true;
    });
    expect(result.status).toBe("ok");
    expect(result.level).toBe(3);
    expect(spent).toBe(result.cost);
    expect(shop.getLevel("precise_aim")).toBe(3);
    // 精准瞄准达到 3 级后解锁快速拉弓。
    expect(result.newlyUnlocked).toContain("quick_draw");
  });
});

describe("ShopService effect readers", () => {
  it("clamps stored levels into range and exposes derived effects", () => {
    const shop = shopWith({ quickDrawLevel: 100, robotArcherLevel: 20, robotGreedLevel: 5 });
    expect(shop.getLevel("quick_draw")).toBe(22); // max level for quick_draw
    expect(shop.shotCooldownSeconds()).toBe(0.35);
    expect(shop.robotCount()).toBe(5);
    expect(shop.robotCoinMultiplier()).toBeCloseTo(1.127357, 6); // 0.7 × 1.1^5
  });
});

describe("uncapped infinite-flow income items", () => {
  it("does not cap greedy_coin or robot_greed at 20", () => {
    // 无限流：纯乘法收益道具解封，高等级仍未满级且价格继续增长。
    const shop = shopWith({ greedyCoinLevel: 50, robotGreedLevel: 50 });
    expect(shop.getLevel("greedy_coin")).toBe(50);
    expect(shop.isMaxed("greedy_coin")).toBe(false);
    expect(shop.getLevel("robot_greed")).toBe(50);
    expect(shop.isMaxed("robot_greed")).toBe(false);
    expect(shop.getCost("greedy_coin")).toBeGreaterThan(0);
    expect(shop.getCost("robot_greed")).toBeGreaterThan(0);
  });

  it("still caps the invariant-bound items", () => {
    const shop = shopWith({ preciseAimLevel: 999, robotRapidFireLevel: 999, coinPetLevel: 999 });
    expect(shop.getLevel("precise_aim")).toBe(20);
    expect(shop.getLevel("robot_rapid_fire")).toBe(20);
    expect(shop.getLevel("coin_pet")).toBe(30);
    expect(shop.isMaxed("precise_aim")).toBe(true);
  });
});
