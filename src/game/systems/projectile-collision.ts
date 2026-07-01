import { findVerticalPlaneCrossing, type Point } from "../utils/ballistics";

export type ProjectileBounds = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

export type ProjectileTarget = {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
};

export type TargetPlaneResolution = {
  readonly hit: boolean;
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
  return {
    hit: Math.abs(crossing.y - target.y) <= target.radius,
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
