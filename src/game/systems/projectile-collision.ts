import { findVerticalPlaneCrossing, type Point } from "../utils/ballistics";
import { resolveRing, type RingScoringConfig } from "./ring-scoring";

export type ProjectileBounds = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

export type ProjectileTarget = {
  readonly x: number;
  readonly y: number;
  readonly scoring: RingScoringConfig;
};

export type TargetPlaneResolution = {
  readonly hit: boolean;
  readonly ring: number;
  readonly point: Point;
};

export function detectTargetPlaneResolution(
  previousTip: Point,
  currentTip: Point,
  target: ProjectileTarget,
): TargetPlaneResolution | null {
  const crossing = findVerticalPlaneCrossing(previousTip, currentTip, target.x);
  if (crossing === null) {
    return null;
  }
  const { hit, ring } = resolveRing(Math.abs(crossing.y - target.y), target.scoring);
  return {
    hit,
    ring,
    point: { x: crossing.x, y: crossing.y },
  };
}

export function isOutsideProjectileBounds(point: Point, bounds: ProjectileBounds): boolean {
  return (
    point.x < bounds.left ||
    point.x > bounds.right ||
    point.y < bounds.top ||
    point.y > bounds.bottom
  );
}
