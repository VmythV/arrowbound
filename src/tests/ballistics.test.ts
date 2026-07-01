import { describe, expect, it } from "vitest";
import { ARROW_SPAWN_POSITION } from "../game/config/game.constants";
import { LEVEL_CONFIGS } from "../game/config/level.config";
import {
  findVerticalPlaneCrossing,
  positionAtTime,
  solveBallisticAngles,
  velocityFromAngle,
} from "../game/utils/ballistics";

describe("ballistic solver", () => {
  it("reaches every configured target edge and center with a low arc in the bow range", () => {
    for (const level of LEVEL_CONFIGS) {
      for (const targetY of [
        level.target.y - level.target.radius,
        level.target.y,
        level.target.y + level.target.radius,
      ]) {
        const target = { x: level.target.x, y: targetY };
        const solution = solveBallisticAngles(
          ARROW_SPAWN_POSITION,
          target,
          level.arrow.speed,
          level.arrow.gravity,
        );

        expect(solution, `level ${level.id} target ${targetY}`).not.toBeNull();
        const lowAngle = solution?.lowAngleDegrees ?? Number.NaN;
        expect(lowAngle).toBeGreaterThanOrEqual(level.bow.swingMinAngle);
        expect(lowAngle).toBeLessThanOrEqual(level.bow.swingMaxAngle);

        const velocity = velocityFromAngle(lowAngle, level.arrow.speed);
        const flightTime = (level.target.x - ARROW_SPAWN_POSITION.x) / velocity.x;
        const impact = positionAtTime(
          ARROW_SPAWN_POSITION,
          velocity,
          level.arrow.gravity,
          flightTime,
        );
        expect(impact.x).toBeCloseTo(target.x, 8);
        expect(impact.y).toBeCloseTo(target.y, 8);
      }
    }
  });

  it("returns no solution for an unreachable target", () => {
    expect(solveBallisticAngles({ x: 0, y: 0 }, { x: 10_000, y: -5_000 }, 100, 900)).toBeNull();
  });
});

describe("continuous target-plane crossing", () => {
  it("interpolates the arrow tip at the exact vertical plane", () => {
    expect(findVerticalPlaneCrossing({ x: 840, y: 380 }, { x: 860, y: 400 }, 850)).toEqual({
      x: 850,
      y: 390,
      interpolation: 0.5,
    });
  });

  it("does not report a crossing before, after, or while moving away from the plane", () => {
    expect(findVerticalPlaneCrossing({ x: 820, y: 380 }, { x: 840, y: 390 }, 850)).toBeNull();
    expect(findVerticalPlaneCrossing({ x: 850, y: 390 }, { x: 860, y: 400 }, 850)).toBeNull();
    expect(findVerticalPlaneCrossing({ x: 860, y: 400 }, { x: 840, y: 390 }, 850)).toBeNull();
  });
});

describe("ballistic trajectory", () => {
  it("produces the same position for the same angle and elapsed time", () => {
    const velocity = velocityFromAngle(-24, 900);
    const direct = positionAtTime(ARROW_SPAWN_POSITION, velocity, 600, 0.75);
    const repeated = positionAtTime(ARROW_SPAWN_POSITION, velocity, 600, 0.25 + 0.5);

    expect(repeated.x).toBeCloseTo(direct.x, 10);
    expect(repeated.y).toBeCloseTo(direct.y, 10);
  });
});
