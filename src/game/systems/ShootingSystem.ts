import type { BowConfig } from "../config/level.config";
import type { StateController } from "../state/StateController";
import { velocityFromAngle, type Velocity } from "../utils/ballistics";

export type ShootingConfig = {
  readonly bow: BowConfig;
  readonly shotCooldownSeconds: number;
  readonly minimumShotCooldownSeconds: number;
};

export type PlayerShot = {
  readonly angle: number;
  readonly velocity: Velocity;
};

export class ShootingSystem {
  private readonly swingRange: number;
  private readonly swingCycle: number;
  private shotCooldownSeconds: number;
  private swingProgress = 0;

  constructor(
    private readonly config: ShootingConfig,
    private readonly state: StateController,
  ) {
    validateShootingConfig(config);
    this.swingRange = config.bow.swingMaxAngle - config.bow.swingMinAngle;
    this.swingCycle = this.swingRange * 2;
    this.shotCooldownSeconds = Math.max(
      config.minimumShotCooldownSeconds,
      config.shotCooldownSeconds,
    );
  }

  /**
   * 更新射箭冷却（快速拉弓/祝福生效时调用），仍受最低冷却下限约束。
   */
  setShotCooldownSeconds(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      throw new RangeError("Shot cooldown must be finite and positive");
    }
    this.shotCooldownSeconds = Math.max(this.config.minimumShotCooldownSeconds, seconds);
  }

  get shotCooldown(): number {
    return this.shotCooldownSeconds;
  }

  get bowAngle(): number {
    if (this.swingRange === 0) {
      return this.config.bow.swingMinAngle;
    }

    const distanceFromMinimum =
      this.swingProgress <= this.swingRange
        ? this.swingProgress
        : this.swingCycle - this.swingProgress;
    return this.config.bow.swingMinAngle + distanceFromMinimum;
  }

  update(deltaMs: number, speedMultiplier = 1): number {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError("Shooting delta must be finite and non-negative");
    }
    if (!Number.isFinite(speedMultiplier) || speedMultiplier < 0) {
      throw new RangeError("Bow speed multiplier must be finite and non-negative");
    }
    this.state.advanceShotCooldown(deltaMs / 1_000);
    if (
      this.state.snapshot.isGameplayPaused ||
      this.swingCycle === 0 ||
      deltaMs === 0 ||
      speedMultiplier === 0
    ) {
      return this.bowAngle;
    }

    const distance = this.config.bow.swingSpeed * speedMultiplier * (deltaMs / 1_000);
    this.swingProgress = (this.swingProgress + distance) % this.swingCycle;
    return this.bowAngle;
  }

  tryShoot(arrowSpeed: number): PlayerShot | null {
    if (!Number.isFinite(arrowSpeed) || arrowSpeed <= 0) {
      throw new RangeError("Arrow speed must be finite and positive");
    }
    if (!this.state.tryStartShotCooldown(this.shotCooldownSeconds)) {
      return null;
    }

    const angle = this.bowAngle;
    return {
      angle,
      velocity: velocityFromAngle(angle, arrowSpeed),
    };
  }
}

function validateShootingConfig(config: ShootingConfig): void {
  const bow = config.bow;
  if (
    !Number.isFinite(bow.swingMinAngle) ||
    !Number.isFinite(bow.swingMaxAngle) ||
    bow.swingMaxAngle < bow.swingMinAngle
  ) {
    throw new RangeError("Bow angle range must be finite and ordered");
  }
  if (!Number.isFinite(bow.swingSpeed) || bow.swingSpeed < 0) {
    throw new RangeError("Bow swing speed must be finite and non-negative");
  }
  if (
    !Number.isFinite(config.shotCooldownSeconds) ||
    config.shotCooldownSeconds <= 0 ||
    !Number.isFinite(config.minimumShotCooldownSeconds) ||
    config.minimumShotCooldownSeconds <= 0
  ) {
    throw new RangeError("Shot cooldown values must be finite and positive");
  }
}
