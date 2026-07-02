import * as Phaser from "phaser";
import { ROBOT_CONFIG } from "../config/robot.config";
import type { ArrowLaunchConfig } from "../entities/Arrow";
import { solveBallisticAngles, velocityFromAngle, type Point } from "../utils/ballistics";
import { effectiveCenterRatio, effectiveTargetRadius, type RingScoringConfig } from "./ring-scoring";
import type { RandomService } from "../utils/random";

export type RobotSystemConfig = {
  readonly texture: string;
  readonly groundY: number;
  readonly target: Point;
  readonly arrowSpeed: number;
  readonly arrowGravity: number;
  /** 当前机器人射击间隔（秒），已并入机械连射等级与机械狂欢祝福。 */
  readonly getShotIntervalSeconds: () => number;
  /** 机械校准祝福的最低目标环；0 表示不生效。 */
  readonly getMinimumRing: () => number;
  /** 当前环数评分配置，用于把目标环映射到靶面高度。 */
  readonly getRingScoring: () => RingScoringConfig;
  readonly launch: (config: ArrowLaunchConfig) => void;
};

type Robot = {
  readonly sprite: Phaser.GameObjects.Image;
  cooldownLeft: number;
  fireTween: Phaser.Tweens.Tween | undefined;
};

const ROBOT_SPACING = 34;
const ROBOT_BASE_X = 118;
const ARROW_SPAWN_DX = 18;
const ARROW_SPAWN_HEIGHT = 150;

/**
 * 机器人自动射击系统。按机械弓手等级维持 0～5 个机器人，各自计时后按概率表抽取目标环、
 * 求解低弧弹道并发射与玩家相同的真实物理箭矢（`source: "robot"`）。
 * 命中、金币与挑战计分都沿用玩家的箭矢结算与统一金币入账，不另设收益通道。
 */
export class RobotSystem {
  private readonly robots: Robot[] = [];
  private paused = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly random: RandomService,
    private readonly config: RobotSystemConfig,
  ) {}

  get count(): number {
    return this.robots.length;
  }

  /**
   * 将机器人数量调整到目标值（0～5），新机器人带 0～0.4 秒随机初始偏移避免同步射击。
   */
  setCount(count: number): void {
    const target = Phaser.Math.Clamp(Math.floor(count), 0, 5);
    while (this.robots.length < target) {
      this.robots.push(this.createRobot(this.robots.length));
    }
    while (this.robots.length > target) {
      this.destroyRobot(this.robots.pop());
    }
  }

  update(deltaMs: number): void {
    if (this.paused || deltaMs <= 0) {
      return;
    }
    const deltaSeconds = deltaMs / 1_000;
    for (const robot of this.robots) {
      robot.cooldownLeft -= deltaSeconds;
      if (robot.cooldownLeft <= 0) {
        robot.cooldownLeft += Math.max(0.1, this.config.getShotIntervalSeconds());
        this.fire(robot);
      }
    }
  }

  setAnimationsPaused(paused: boolean): void {
    if (paused === this.paused) {
      return;
    }
    this.paused = paused;
    for (const robot of this.robots) {
      if (paused) {
        robot.fireTween?.pause();
      } else {
        robot.fireTween?.resume();
      }
    }
  }

  destroy(): void {
    while (this.robots.length > 0) {
      this.destroyRobot(this.robots.pop());
    }
  }

  private fire(robot: Robot): void {
    const targetPoint = this.pickTargetPoint();
    const origin: Point = {
      x: robot.sprite.x + ARROW_SPAWN_DX,
      y: this.config.groundY - ARROW_SPAWN_HEIGHT,
    };
    const solution = solveBallisticAngles(
      origin,
      targetPoint,
      this.config.arrowSpeed,
      this.config.arrowGravity,
    );
    this.playFireAnimation(robot);
    if (solution === null) {
      // 弹道无解：本次射击判定为脱靶，不产生箭矢与收益。
      return;
    }
    this.config.launch({
      origin,
      velocity: velocityFromAngle(solution.lowAngleDegrees, this.config.arrowSpeed),
      gravity: this.config.arrowGravity,
      runtimeData: { source: "robot" },
    });
  }

  private pickTargetPoint(): Point {
    const minimumRing = this.config.getMinimumRing();
    const drawnRing = this.random.weightedPick(
      ROBOT_CONFIG.aimWeights.map((entry) => ({ value: entry.ring, weight: entry.weight })),
    );
    const ring = Math.max(drawnRing, minimumRing);

    const scoring = this.config.getRingScoring();
    const radius = effectiveTargetRadius(scoring);
    const center = effectiveCenterRatio(scoring);
    let innerRatio: number;
    let outerRatio: number;
    if (ring >= 10) {
      innerRatio = 0;
      outerRatio = center;
    } else {
      const width = (1 - center) / 9;
      const stepsFromCenter = 10 - ring;
      outerRatio = center + stepsFromCenter * width;
      innerRatio = center + (stepsFromCenter - 1) * width;
    }
    const normalized = innerRatio + this.random.next() * (outerRatio - innerRatio);
    const distance = normalized * radius;
    const direction = this.random.next() < 0.5 ? -1 : 1;
    return { x: this.config.target.x, y: this.config.target.y + direction * distance };
  }

  private playFireAnimation(robot: Robot): void {
    robot.fireTween?.stop();
    robot.sprite.setScale(1);
    robot.fireTween = this.scene.tweens.add({
      targets: robot.sprite,
      scaleY: { from: 0.92, to: 1 },
      scaleX: { from: 1.05, to: 1 },
      duration: 180,
      ease: "Quad.Out",
      paused: this.paused,
      onComplete: () => {
        robot.sprite.setScale(1);
        robot.fireTween = undefined;
      },
    });
  }

  private createRobot(index: number): Robot {
    const sprite = this.scene.add
      .image(ROBOT_BASE_X - index * ROBOT_SPACING, this.config.groundY - 4, this.config.texture)
      .setOrigin(0.5, 1)
      .setScale(0.7)
      .setDepth(-5);
    return {
      sprite,
      cooldownLeft: this.random.next() * ROBOT_CONFIG.maximumInitialDelaySeconds,
      fireTween: undefined,
    };
  }

  private destroyRobot(robot: Robot | undefined): void {
    if (robot === undefined) {
      return;
    }
    robot.fireTween?.stop();
    robot.sprite.destroy();
  }
}
