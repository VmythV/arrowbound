import type { BowConfig } from "../config/level.config";

export class ShootingSystem {
  private readonly swingRange: number;
  private readonly swingCycle: number;
  private swingProgress = 0;

  constructor(private readonly bowConfig: BowConfig) {
    validateBowConfig(bowConfig);
    this.swingRange = bowConfig.swingMaxAngle - bowConfig.swingMinAngle;
    this.swingCycle = this.swingRange * 2;
  }

  get bowAngle(): number {
    if (this.swingRange === 0) {
      return this.bowConfig.swingMinAngle;
    }

    const distanceFromMinimum =
      this.swingProgress <= this.swingRange
        ? this.swingProgress
        : this.swingCycle - this.swingProgress;
    return this.bowConfig.swingMinAngle + distanceFromMinimum;
  }

  update(deltaMs: number, speedMultiplier = 1): number {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError("Shooting delta must be finite and non-negative");
    }
    if (!Number.isFinite(speedMultiplier) || speedMultiplier < 0) {
      throw new RangeError("Bow speed multiplier must be finite and non-negative");
    }
    if (this.swingCycle === 0 || deltaMs === 0 || speedMultiplier === 0) {
      return this.bowAngle;
    }

    const distance = this.bowConfig.swingSpeed * speedMultiplier * (deltaMs / 1_000);
    this.swingProgress = (this.swingProgress + distance) % this.swingCycle;
    return this.bowAngle;
  }
}

function validateBowConfig(config: BowConfig): void {
  if (
    !Number.isFinite(config.swingMinAngle) ||
    !Number.isFinite(config.swingMaxAngle) ||
    config.swingMaxAngle < config.swingMinAngle
  ) {
    throw new RangeError("Bow angle range must be finite and ordered");
  }
  if (!Number.isFinite(config.swingSpeed) || config.swingSpeed < 0) {
    throw new RangeError("Bow swing speed must be finite and non-negative");
  }
}
