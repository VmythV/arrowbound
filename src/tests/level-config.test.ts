import { describe, expect, it } from "vitest";
import {
  ARROW_SPAWN_POSITION,
  CENTER_RING_RATIO_CAP,
  MAX_LEVEL_ID,
} from "../game/config/game.constants";
import { getLevelConfig, HANDCRAFTED_LEVEL_COUNT, LEVEL_CONFIGS } from "../game/config/level.config";
import { solveBallisticAngles } from "../game/utils/ballistics";

describe("getLevelConfig", () => {
  it("returns the handcrafted config for levels 1..10", () => {
    for (const handcrafted of LEVEL_CONFIGS) {
      expect(getLevelConfig(handcrafted.id)).toBe(handcrafted);
    }
    expect(HANDCRAFTED_LEVEL_COUNT).toBe(LEVEL_CONFIGS.length);
  });

  it("rejects out-of-range or non-integer ids", () => {
    expect(getLevelConfig(0)).toBeUndefined();
    expect(getLevelConfig(-1)).toBeUndefined();
    expect(getLevelConfig(1.5)).toBeUndefined();
    expect(getLevelConfig(MAX_LEVEL_ID + 1)).toBeUndefined();
    expect(getLevelConfig(Number.NaN)).toBeUndefined();
  });

  it("generates level 11 with the documented economy values", () => {
    const level = getLevelConfig(11);
    expect(level).toBeDefined();
    expect(level?.id).toBe(11);
    expect(level?.name).toBe("新手靶场·2周目");
    expect(level?.clearCoinGoal).toBe(10200);
    expect(level?.challengeTargetCoins).toBe(3060);
    expect(level?.challengeDurationSeconds).toBe(60);
  });

  it("returns a stable cached instance for a generated level", () => {
    expect(getLevelConfig(42)).toBe(getLevelConfig(42));
  });

  it("grows the clear goal monotonically past the handcrafted levels", () => {
    let previous = getLevelConfig(10)?.clearCoinGoal ?? 0;
    for (let id = 11; id <= 60; id += 1) {
      const goal = getLevelConfig(id)?.clearCoinGoal ?? 0;
      expect(goal).toBeGreaterThan(previous);
      previous = goal;
    }
  });

  it("keeps generated geometry converging within playable bounds", () => {
    for (let id = 11; id <= 400; id += 7) {
      const level = getLevelConfig(id);
      expect(level).toBeDefined();
      if (level === undefined) continue;
      expect(level.target.x).toBeGreaterThanOrEqual(1100);
      expect(level.target.x).toBeLessThanOrEqual(1160);
      expect(level.target.radius).toBeGreaterThanOrEqual(50);
      expect(level.target.radius).toBeLessThanOrEqual(62);
      expect(level.target.y).toBeGreaterThanOrEqual(320);
      expect(level.target.y).toBeLessThan(440);
      expect(level.target.centerRingRatio).toBeGreaterThanOrEqual(0.065);
      expect(level.target.centerRingRatio).toBeLessThanOrEqual(CENTER_RING_RATIO_CAP);
      expect(level.bow.swingSpeed).toBeGreaterThanOrEqual(60);
      expect(level.bow.swingSpeed).toBeLessThanOrEqual(78);
      expect(level.arrow.speed).toBeGreaterThanOrEqual(1020);
      expect(level.arrow.speed).toBeLessThanOrEqual(1120);
      expect(level.arrow.gravity).toBeGreaterThanOrEqual(900);
      expect(level.arrow.gravity).toBeLessThanOrEqual(980);
    }
  });

  it("converges geometry toward the caps at high levels", () => {
    const far = getLevelConfig(200);
    expect(far?.target.x).toBe(1160);
    expect(far?.target.radius).toBe(50);
    expect(far?.target.centerRingRatio).toBe(0.065);
    expect(far?.bow.swingSpeed).toBe(78);
    expect(far?.arrow.speed).toBe(1120);
    expect(far?.arrow.gravity).toBe(980);
  });

  it("keeps generated targets reachable within the bow swing window", () => {
    for (const id of [11, 12, 15, 30, 100, 500]) {
      const level = getLevelConfig(id);
      expect(level).toBeDefined();
      if (level === undefined) continue;
      const solution = solveBallisticAngles(
        ARROW_SPAWN_POSITION,
        { x: level.target.x, y: level.target.y },
        level.arrow.speed,
        level.arrow.gravity,
      );
      expect(solution).not.toBeNull();
      // 低弧发射角必须落在弓摆动窗口内，玩家才可能命中靶心。
      expect(solution?.lowAngleDegrees).toBeGreaterThanOrEqual(level.bow.swingMinAngle);
      expect(solution?.lowAngleDegrees).toBeLessThanOrEqual(level.bow.swingMaxAngle);
    }
  });
});
