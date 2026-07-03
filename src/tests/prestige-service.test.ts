import { describe, expect, it } from "vitest";
import { PrestigeService, PRESTIGE_UNLOCK_LEVEL, stardustFor } from "../game/systems/PrestigeService";

describe("stardustFor", () => {
  it("grants no stardust before the unlock level", () => {
    expect(stardustFor(0)).toBe(0);
    expect(stardustFor(PRESTIGE_UNLOCK_LEVEL - 1)).toBe(0);
  });

  it("grows superlinearly past the unlock level", () => {
    expect(stardustFor(PRESTIGE_UNLOCK_LEVEL)).toBe(1); // over = 1
    expect(stardustFor(20)).toBe(Math.floor(6 ** 1.5)); // 14
    expect(stardustFor(30)).toBe(Math.floor(16 ** 1.5)); // 64
    expect(stardustFor(30)).toBeGreaterThan(stardustFor(20) * 2);
  });
});

describe("PrestigeService", () => {
  it("applies a permanent global multiplier of 1 + 0.05 per stardust", () => {
    expect(new PrestigeService({ stardust: 0, count: 0 }).multiplier()).toBe(1);
    expect(new PrestigeService({ stardust: 10, count: 1 }).multiplier()).toBeCloseTo(1.5, 10);
  });

  it("reports pending stardust and prestige availability by highest cleared level", () => {
    const service = new PrestigeService();
    expect(service.canPrestige(10)).toBe(false);
    expect(service.canPrestige(PRESTIGE_UNLOCK_LEVEL)).toBe(true);
    expect(service.pendingStardust(20)).toBe(14);
  });

  it("round-trips its save data and sanitizes negatives", () => {
    expect(new PrestigeService({ stardust: 42, count: 3 }).toSaveData()).toEqual({
      stardust: 42,
      count: 3,
    });
    expect(new PrestigeService({ stardust: -5, count: -1 }).toSaveData()).toEqual({
      stardust: 0,
      count: 0,
    });
  });
});
