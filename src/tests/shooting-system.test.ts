import { describe, expect, it } from "vitest";
import type { BowConfig } from "../game/config/level.config";
import type { GameEventBus } from "../game/events/GameEventBus";
import { StateController } from "../game/state/StateController";
import { ShootingSystem } from "../game/systems/ShootingSystem";

const FIRST_LEVEL_BOW: BowConfig = {
  swingMinAngle: -40,
  swingMaxAngle: 5,
  swingSpeed: 32,
};

function createShooting(
  shotCooldownSeconds = 1.2,
  minimumShotCooldownSeconds = 0.35,
): { shooting: ShootingSystem; state: StateController } {
  const events = { emit: () => false } as unknown as GameEventBus;
  const state = new StateController(events);
  state.transitionTo("playing");
  return {
    shooting: new ShootingSystem(
      {
        bow: FIRST_LEVEL_BOW,
        shotCooldownSeconds,
        minimumShotCooldownSeconds,
      },
      state,
    ),
    state,
  };
}

describe("ShootingSystem bow swing", () => {
  it("moves from the minimum angle at the configured degrees per second", () => {
    const { shooting } = createShooting();

    expect(shooting.bowAngle).toBe(-40);
    expect(shooting.update(500)).toBe(-24);
  });

  it("reflects at both angle limits without overshooting", () => {
    const { shooting } = createShooting();

    expect(shooting.update(1_406.25)).toBe(5);
    expect(shooting.update(500)).toBe(-11);
    expect(shooting.update(906.25)).toBe(-40);
  });

  it("is deterministic across split frames and complete cycles", () => {
    const { shooting: oneFrame } = createShooting();
    const { shooting: splitFrames } = createShooting();

    oneFrame.update(3_312.5);
    splitFrames.update(1_000);
    splitFrames.update(1_500);
    splitFrames.update(812.5);

    expect(splitFrames.bowAngle).toBeCloseTo(oneFrame.bowAngle, 10);
    expect(oneFrame.bowAngle).toBe(-24);
  });

  it("rejects invalid time and speed multipliers", () => {
    const { shooting } = createShooting();

    expect(() => shooting.update(-1)).toThrow(RangeError);
    expect(() => shooting.update(16, -0.1)).toThrow(RangeError);
  });
});

describe("ShootingSystem shot cooldown", () => {
  it("captures the current bow angle and blocks shots during the initial cooldown", () => {
    const { shooting, state } = createShooting();
    shooting.update(500);

    const shot = shooting.tryShoot(900);

    expect(shot?.angle).toBe(-24);
    expect(shot?.velocity.x).toBeCloseTo(Math.cos((-24 * Math.PI) / 180) * 900, 10);
    expect(state.snapshot.shootCooldownLeft).toBe(1.2);
    expect(state.snapshot.canShoot).toBe(false);
    expect(shooting.tryShoot(900)).toBeNull();

    shooting.update(1_200);
    expect(state.snapshot.shootCooldownLeft).toBe(0);
    expect(state.snapshot.canShoot).toBe(true);
    expect(shooting.tryShoot(900)).not.toBeNull();
  });

  it("enforces the configured minimum cooldown", () => {
    const { shooting, state } = createShooting(0.1, 0.35);

    expect(shooting.tryShoot(900)).not.toBeNull();
    expect(state.snapshot.shootCooldownLeft).toBe(0.35);
  });

  it("pauses bow movement and cooldown together", () => {
    const { shooting, state } = createShooting();
    expect(shooting.tryShoot(900)).not.toBeNull();
    state.setVisibilityPaused(true);

    shooting.update(5_000);

    expect(shooting.bowAngle).toBe(-40);
    expect(state.snapshot.shootCooldownLeft).toBe(1.2);
  });
});
