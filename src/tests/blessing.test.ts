import { describe, expect, it } from "vitest";
import { BLESSING_CONFIGS } from "../game/config/blessing.config";
import { BlessingService } from "../game/systems/BlessingService";
import { NEUTRAL_BLESSING_EFFECTS, resolveBlessingEffects } from "../game/systems/blessing-effects";
import { RandomService } from "../game/utils/random";

const ALL_UNLOCKED = { hasRobot: true, hasCoinPet: true };
const NONE_UNLOCKED = { hasRobot: false, hasCoinPet: false };

describe("resolveBlessingEffects", () => {
  it("returns neutral effects for no selection or an unknown id", () => {
    expect(resolveBlessingEffects(undefined)).toEqual(NEUTRAL_BLESSING_EFFECTS);
    expect(resolveBlessingEffects("not-a-blessing")).toEqual(NEUTRAL_BLESSING_EFFECTS);
  });

  it("maps each blessing to a single non-neutral effect", () => {
    expect(resolveBlessingEffects("gold_bonus_30").allCoinMultiplier).toBeCloseTo(1.3, 10);
    expect(resolveBlessingEffects("ten_ring_bonus").tenRingMultiplier).toBe(2);
    expect(resolveBlessingEffects("stable_bow").bowSpeedMultiplier).toBeCloseTo(0.8, 10);
    expect(resolveBlessingEffects("quick_shot").cooldownMultiplier).toBeCloseTo(0.8, 10);
    expect(resolveBlessingEffects("large_center").centerRadiusMultiplier).toBeCloseTo(1.2, 10);
    expect(resolveBlessingEffects("wide_target").targetRadiusMultiplier).toBeCloseTo(1.15, 10);
    expect(resolveBlessingEffects("robot_frenzy").robotIntervalDivisor).toBe(1.5);
    expect(resolveBlessingEffects("robot_calibration").robotMinimumRing).toBe(3);
    expect(resolveBlessingEffects("pet_excitement").petIntervalDivisor).toBe(2);
    expect(resolveBlessingEffects("lucky_first_ten").luckyFirstTen).toBe(true);
  });

  it("keeps the all-coin blessing applicable to both player and robot income", () => {
    // 该祝福只改动 allCoinMultiplier，收益公式对玩家与机器人同样乘上它。
    const effects = resolveBlessingEffects("gold_bonus_30");
    expect(effects.allCoinMultiplier).toBeGreaterThan(1);
    expect(effects.tenRingMultiplier).toBe(1);
  });
});

describe("BlessingService.drawCandidates", () => {
  it("draws three distinct always-available candidates by default", () => {
    const service = new BlessingService(new RandomService("seed-a"));
    const draw = service.drawCandidates(NONE_UNLOCKED);
    expect(draw.candidates).toHaveLength(3);
    expect(draw.usedExtraChoice).toBe(false);
    expect(new Set(draw.candidates.map((candidate) => candidate.id)).size).toBe(3);
    for (const candidate of draw.candidates) {
      expect(candidate.availability).toBe("always");
    }
  });

  it("excludes robot and pet blessings until their systems are unlocked", () => {
    const service = new BlessingService(new RandomService("seed-b"));
    for (let trial = 0; trial < 40; trial += 1) {
      const draw = service.drawCandidates(NONE_UNLOCKED);
      for (const candidate of draw.candidates) {
        expect(candidate.availability).toBe("always");
      }
    }
    const withRobot = new BlessingService(new RandomService("seed-b"), 1).drawCandidates({
      hasRobot: true,
      hasCoinPet: false,
    });
    expect(withRobot.candidates.every((candidate) => candidate.availability !== "has_coin_pet")).toBe(true);
  });

  it("offers a fourth candidate and consumes one extra choice", () => {
    const service = new BlessingService(new RandomService("seed-c"), 1);
    expect(service.pendingExtraChoices).toBe(1);
    const draw = service.drawCandidates(ALL_UNLOCKED);
    expect(draw.candidates).toHaveLength(4);
    expect(draw.usedExtraChoice).toBe(true);
    expect(service.pendingExtraChoices).toBe(0);

    // 用尽后回到 3 选 1，未消耗的次数才继续保留。
    const next = service.drawCandidates(ALL_UNLOCKED);
    expect(next.candidates).toHaveLength(3);
    expect(next.usedExtraChoice).toBe(false);
  });

  it("keeps unused extra choices when a level does not consume them", () => {
    const service = new BlessingService(new RandomService("seed-d"));
    service.grantExtraChoice();
    service.grantExtraChoice();
    expect(service.pendingExtraChoices).toBe(2);
    service.drawCandidates(ALL_UNLOCKED);
    expect(service.pendingExtraChoices).toBe(1);
  });

  it("is deterministic for a fixed seed", () => {
    const first = new BlessingService(new RandomService(1234)).drawCandidates(ALL_UNLOCKED);
    const second = new BlessingService(new RandomService(1234)).drawCandidates(ALL_UNLOCKED);
    expect(first.candidates.map((candidate) => candidate.id)).toEqual(
      second.candidates.map((candidate) => candidate.id),
    );
  });

  it("has at least seven always-available blessings so drawing never starves", () => {
    const alwaysCount = BLESSING_CONFIGS.filter((config) => config.availability === "always").length;
    expect(alwaysCount).toBeGreaterThanOrEqual(7);
  });
});
