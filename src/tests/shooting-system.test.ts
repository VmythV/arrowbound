import { describe, expect, it } from "vitest";
import type { BowConfig } from "../game/config/level.config";
import { ShootingSystem } from "../game/systems/ShootingSystem";

const FIRST_LEVEL_BOW: BowConfig = {
  swingMinAngle: -40,
  swingMaxAngle: 5,
  swingSpeed: 32,
};

describe("ShootingSystem bow swing", () => {
  it("moves from the minimum angle at the configured degrees per second", () => {
    const shooting = new ShootingSystem(FIRST_LEVEL_BOW);

    expect(shooting.bowAngle).toBe(-40);
    expect(shooting.update(500)).toBe(-24);
  });

  it("reflects at both angle limits without overshooting", () => {
    const shooting = new ShootingSystem(FIRST_LEVEL_BOW);

    expect(shooting.update(1_406.25)).toBe(5);
    expect(shooting.update(500)).toBe(-11);
    expect(shooting.update(906.25)).toBe(-40);
  });

  it("is deterministic across split frames and complete cycles", () => {
    const oneFrame = new ShootingSystem(FIRST_LEVEL_BOW);
    const splitFrames = new ShootingSystem(FIRST_LEVEL_BOW);

    oneFrame.update(3_312.5);
    splitFrames.update(1_000);
    splitFrames.update(1_500);
    splitFrames.update(812.5);

    expect(splitFrames.bowAngle).toBeCloseTo(oneFrame.bowAngle, 10);
    expect(oneFrame.bowAngle).toBe(-24);
  });

  it("rejects invalid time and speed multipliers", () => {
    const shooting = new ShootingSystem(FIRST_LEVEL_BOW);

    expect(() => shooting.update(-1)).toThrow(RangeError);
    expect(() => shooting.update(16, -0.1)).toThrow(RangeError);
  });
});
