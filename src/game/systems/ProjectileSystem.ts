import * as Phaser from "phaser";
import type { ArrowLaunchConfig } from "../entities/Arrow";
import { Arrow } from "../entities/Arrow";
import type { ArrowRuntimeData } from "../state/RuntimeState";
import type { Point } from "../utils/ballistics";
import {
  detectTargetPlaneResolution,
  isOutsideProjectileBounds,
  type ProjectileBounds,
  type ProjectileTarget,
} from "./projectile-collision";

export type { ProjectileBounds, ProjectileTarget } from "./projectile-collision";

const HIT_HOLD_DURATION_MS = 120;

export type ProjectileResolution = {
  readonly hit: boolean;
  readonly ring: number;
  readonly point: Point;
  readonly runtimeData: ArrowRuntimeData;
  readonly reason: "target_hit" | "target_miss" | "out_of_bounds";
};

export type ProjectileSystemConfig = {
  readonly texture: string;
  readonly bounds: ProjectileBounds;
  readonly target: ProjectileTarget;
  readonly onResolved: (resolution: ProjectileResolution) => void;
};

export class ProjectileSystem {
  private readonly pool: Phaser.GameObjects.Group;
  private target: ProjectileTarget;

  constructor(
    scene: Phaser.Scene,
    private readonly config: ProjectileSystemConfig,
  ) {
    this.target = config.target;
    this.pool = scene.add.group({
      classType: Arrow,
      defaultKey: config.texture,
    });
  }

  get activeCount(): number {
    return this.pool.countActive(true);
  }

  /**
   * 更新命中判定所用的环数评分配置（商店/祝福生效时调用）。
   * 因商店打开时主游戏暂停、无在飞箭矢结算，切换不会影响进行中的判定。
   */
  setTargetScoring(scoring: ProjectileTarget["scoring"]): void {
    this.target = { ...this.target, scoring };
  }

  launch(config: ArrowLaunchConfig): Arrow {
    const arrow = this.pool.get(
      config.origin.x,
      config.origin.y,
      this.config.texture,
    ) as Arrow | null;
    if (arrow === null) {
      throw new Error("Arrow pool could not provide an arrow");
    }
    arrow.launch(config);
    return arrow;
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError("Projectile delta must be finite and non-negative");
    }

    for (const child of this.pool.getChildren()) {
      const arrow = child as Arrow;
      if (!arrow.active) {
        continue;
      }
      if (arrow.isHoldingHit) {
        if (arrow.advanceHitHold(deltaMs)) {
          this.release(arrow);
        }
        continue;
      }

      const step = arrow.step(deltaMs);
      if (!arrow.targetPlaneChecked) {
        const targetResolution = detectTargetPlaneResolution(
          step.previousTip,
          step.currentTip,
          this.target,
        );
        if (targetResolution !== null) {
          arrow.targetPlaneChecked = true;
          if (targetResolution.hit) {
            this.report(arrow, true, targetResolution.ring, targetResolution.point, "target_hit");
            arrow.holdAt(targetResolution.point, HIT_HOLD_DURATION_MS);
            continue;
          }
        }
      }

      if (isOutsideProjectileBounds(step.currentTip, this.config.bounds)) {
        if (!arrow.outcomeReported) {
          this.report(arrow, false, 0, step.currentTip, "out_of_bounds");
        }
        this.release(arrow);
      }
    }
  }

  releaseAll(): void {
    for (const child of this.pool.getChildren()) {
      const arrow = child as Arrow;
      if (arrow.active) {
        this.release(arrow);
      }
    }
  }

  setAnimationsPaused(paused: boolean): void {
    for (const child of this.pool.getChildren()) {
      const arrow = child as Arrow;
      if (arrow.active) {
        arrow.setAnimationPaused(paused);
      }
    }
  }

  destroy(): void {
    this.pool.destroy(true);
  }

  private report(
    arrow: Arrow,
    hit: boolean,
    ring: number,
    point: Point,
    reason: ProjectileResolution["reason"],
  ): void {
    const runtimeData = arrow.runtimeData;
    if (runtimeData === undefined) {
      throw new Error("Active arrow is missing runtime data");
    }
    arrow.outcomeReported = true;
    this.config.onResolved({ hit, ring, point, runtimeData: { ...runtimeData }, reason });
  }

  private release(arrow: Arrow): void {
    arrow.recycle();
    this.pool.killAndHide(arrow);
  }
}
