import { describe, expect, it } from "vitest";
import {
  detectTargetPlaneResolution,
  isOutsideProjectileBounds,
  type ProjectileBounds,
  type ProjectileTarget,
} from "../game/systems/projectile-collision";

const TARGET: ProjectileTarget = { x: 850, y: 390, radius: 90 };
const BOUNDS: ProjectileBounds = { left: -160, right: 1_440, top: -160, bottom: 620 };

describe("ProjectileSystem target-plane resolution", () => {
  it("records the interpolated impact point and includes the exact target edge", () => {
    expect(
      detectTargetPlaneResolution({ x: 840, y: 290 }, { x: 860, y: 310 }, TARGET),
    ).toEqual({ hit: true, point: { x: 850, y: 300 } });
  });

  it("reports a plane crossing immediately outside the target as a miss", () => {
    expect(
      detectTargetPlaneResolution({ x: 840, y: 289 }, { x: 860, y: 309 }, TARGET),
    ).toEqual({ hit: false, point: { x: 850, y: 299 } });
  });

  it("does not resolve before the arrow tip crosses the target plane", () => {
    expect(
      detectTargetPlaneResolution({ x: 820, y: 390 }, { x: 840, y: 390 }, TARGET),
    ).toBeNull();
  });
});

describe("ProjectileSystem recycle bounds", () => {
  it("keeps exact boundary points active and rejects points beyond every edge", () => {
    expect(isOutsideProjectileBounds({ x: -160, y: 620 }, BOUNDS)).toBe(false);
    expect(isOutsideProjectileBounds({ x: -161, y: 0 }, BOUNDS)).toBe(true);
    expect(isOutsideProjectileBounds({ x: 1_441, y: 0 }, BOUNDS)).toBe(true);
    expect(isOutsideProjectileBounds({ x: 0, y: -161 }, BOUNDS)).toBe(true);
    expect(isOutsideProjectileBounds({ x: 0, y: 621 }, BOUNDS)).toBe(true);
  });
});
