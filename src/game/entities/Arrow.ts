import * as Phaser from "phaser";
import type { ArrowRuntimeData } from "../state/RuntimeState";
import { positionAtTime, type Point, type Velocity } from "../utils/ballistics";

const ARROW_TIP_ORIGIN_X = 158 / 160;

export type ArrowLaunchConfig = {
  readonly origin: Point;
  readonly velocity: Velocity;
  readonly gravity: number;
  readonly runtimeData: ArrowRuntimeData;
};

export type ArrowStep = {
  readonly previousTip: Point;
  readonly currentTip: Point;
};

export class Arrow extends Phaser.GameObjects.Image {
  private originPoint: Point = { x: 0, y: 0 };
  private initialVelocity: Velocity = { x: 0, y: 0 };
  private elapsedSeconds = 0;
  private gravity = 0;
  private hitHoldLeftMs = 0;
  runtimeData: ArrowRuntimeData | undefined;
  targetPlaneChecked = false;
  outcomeReported = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number,
  ) {
    super(scene, x, y, texture, frame);
    this.setOrigin(ARROW_TIP_ORIGIN_X, 0.5).setActive(false).setVisible(false);
  }

  get currentTip(): Point {
    return { x: this.x, y: this.y };
  }

  get currentVelocity(): Velocity {
    return {
      x: this.initialVelocity.x,
      y: this.initialVelocity.y + this.gravity * this.elapsedSeconds,
    };
  }

  get isHoldingHit(): boolean {
    return this.hitHoldLeftMs > 0;
  }

  launch(config: ArrowLaunchConfig): void {
    this.originPoint = { ...config.origin };
    this.initialVelocity = { ...config.velocity };
    this.gravity = config.gravity;
    this.elapsedSeconds = 0;
    this.hitHoldLeftMs = 0;
    this.runtimeData = { ...config.runtimeData };
    this.targetPlaneChecked = false;
    this.outcomeReported = false;
    this.setPosition(config.origin.x, config.origin.y)
      .setRotation(Math.atan2(config.velocity.y, config.velocity.x))
      .setActive(true)
      .setVisible(true);
  }

  step(deltaMs: number): ArrowStep {
    const previousTip = this.currentTip;
    this.elapsedSeconds += deltaMs / 1_000;
    const currentTip = positionAtTime(
      this.originPoint,
      this.initialVelocity,
      this.gravity,
      this.elapsedSeconds,
    );
    const velocity = this.currentVelocity;
    this.setPosition(currentTip.x, currentTip.y).setRotation(Math.atan2(velocity.y, velocity.x));
    return { previousTip, currentTip };
  }

  holdAt(point: Point, durationMs: number): void {
    this.setPosition(point.x, point.y);
    this.hitHoldLeftMs = durationMs;
  }

  advanceHitHold(deltaMs: number): boolean {
    this.hitHoldLeftMs = Math.max(0, this.hitHoldLeftMs - deltaMs);
    return this.hitHoldLeftMs === 0;
  }

  recycle(): void {
    this.runtimeData = undefined;
    this.targetPlaneChecked = false;
    this.outcomeReported = false;
    this.hitHoldLeftMs = 0;
    this.gravity = 0;
    this.elapsedSeconds = 0;
    this.initialVelocity = { x: 0, y: 0 };
    this.originPoint = { x: 0, y: 0 };
    this.setActive(false).setVisible(false).setPosition(0, 0).setRotation(0);
  }
}
