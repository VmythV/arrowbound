export type Point = {
  readonly x: number;
  readonly y: number;
};

export type Velocity = {
  readonly x: number;
  readonly y: number;
};

export type BallisticSolution = {
  readonly lowAngleDegrees: number;
  readonly highAngleDegrees: number;
};

export type PlaneCrossing = Point & {
  readonly interpolation: number;
};

const RADIANS_TO_DEGREES = 180 / Math.PI;

export function solveBallisticAngles(
  origin: Point,
  target: Point,
  speed: number,
  gravity: number,
): BallisticSolution | null {
  if (!Number.isFinite(speed) || speed <= 0 || !Number.isFinite(gravity) || gravity <= 0) {
    throw new RangeError("Ballistic speed and gravity must be finite and positive");
  }

  const horizontalDistance = target.x - origin.x;
  const verticalDistance = target.y - origin.y;
  if (horizontalDistance <= 0) {
    return null;
  }

  const speedSquared = speed * speed;
  const discriminant =
    speedSquared * speedSquared -
    gravity * (gravity * horizontalDistance * horizontalDistance - 2 * verticalDistance * speedSquared);

  if (discriminant < 0) {
    return null;
  }

  const root = Math.sqrt(Math.max(0, discriminant));
  const denominator = gravity * horizontalDistance;
  const lowTangent = (-speedSquared + root) / denominator;
  const highTangent = (-speedSquared - root) / denominator;

  return {
    lowAngleDegrees: Math.atan(lowTangent) * RADIANS_TO_DEGREES,
    highAngleDegrees: Math.atan(highTangent) * RADIANS_TO_DEGREES,
  };
}

export function velocityFromAngle(angleDegrees: number, speed: number): Velocity {
  if (!Number.isFinite(angleDegrees) || !Number.isFinite(speed) || speed < 0) {
    throw new RangeError("Angle and speed must be finite, and speed cannot be negative");
  }

  const angleRadians = angleDegrees / RADIANS_TO_DEGREES;
  return {
    x: Math.cos(angleRadians) * speed,
    y: Math.sin(angleRadians) * speed,
  };
}

export function positionAtTime(
  origin: Point,
  initialVelocity: Velocity,
  gravity: number,
  timeSeconds: number,
): Point {
  if (!Number.isFinite(gravity) || gravity < 0 || !Number.isFinite(timeSeconds) || timeSeconds < 0) {
    throw new RangeError("Gravity and time must be finite and non-negative");
  }

  return {
    x: origin.x + initialVelocity.x * timeSeconds,
    y: origin.y + initialVelocity.y * timeSeconds + 0.5 * gravity * timeSeconds * timeSeconds,
  };
}

export function findVerticalPlaneCrossing(
  previousTip: Point,
  currentTip: Point,
  planeX: number,
): PlaneCrossing | null {
  if (!Number.isFinite(planeX)) {
    throw new RangeError("Target plane must be finite");
  }
  if (previousTip.x >= planeX || currentTip.x < planeX || currentTip.x <= previousTip.x) {
    return null;
  }

  const interpolation = (planeX - previousTip.x) / (currentTip.x - previousTip.x);
  return {
    x: planeX,
    y: previousTip.y + (currentTip.y - previousTip.y) * interpolation,
    interpolation,
  };
}
