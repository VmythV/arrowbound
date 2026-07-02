import { describe, expect, it } from "vitest";
import {
  petMoveSpeedForLevel,
  petPickupCountForLevel,
  petPickupIntervalForLevel,
} from "../game/systems/ShopService";

describe("coin pet scaling", () => {
  it("increases move speed by 8 px/s per level from a 220 baseline", () => {
    expect(petMoveSpeedForLevel(1)).toBe(220);
    expect(petMoveSpeedForLevel(10)).toBe(292);
    // 未解锁按 1 级基线，避免负数或零速。
    expect(petMoveSpeedForLevel(0)).toBe(220);
  });

  it("shortens the pickup interval by 0.1s per level down to a 0.7s floor", () => {
    expect(petPickupIntervalForLevel(1)).toBeCloseTo(2, 10);
    expect(petPickupIntervalForLevel(11)).toBeCloseTo(1, 10);
    expect(petPickupIntervalForLevel(30)).toBe(0.7);
  });

  it("raises the per-pickup count at levels 20 and 30", () => {
    expect(petPickupCountForLevel(1)).toBe(1);
    expect(petPickupCountForLevel(19)).toBe(1);
    expect(petPickupCountForLevel(20)).toBe(2);
    expect(petPickupCountForLevel(29)).toBe(2);
    expect(petPickupCountForLevel(30)).toBe(3);
  });
});
