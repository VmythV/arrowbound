import * as Phaser from "phaser";
import type { CoinSource } from "../systems/coin-income";
import type { Point } from "../utils/ballistics";

export type CoinSpawnConfig = {
  readonly id: number;
  readonly value: number;
  readonly source: CoinSource;
  readonly challengeRunId?: string;
  readonly assetKey: string;
  readonly scale: number;
  readonly bounces: number;
  readonly glow: boolean;
  /** 掉落起点（命中点）。 */
  readonly origin: Point;
  /** 落地目标点。 */
  readonly landing: Point;
};

const FALL_DURATION_MS = 380;
const BOUNCE_DURATION_MS = 130;
const BOUNCE_HEIGHT = 16;
const PICKUP_DURATION_MS = 180;
const GLOW_DURATION_MS = 520;
const VALUE_LABEL_DURATION_MS = 620;

/**
 * 单个金币掉落物。自身管理掉落、弹跳、拾取和光圈动效及其暂停，价值在生成时固定。
 */
export class Coin extends Phaser.GameObjects.Image {
  id = 0;
  value = 0;
  source: CoinSource = "player";
  challengeRunId: string | undefined;
  private locked = false;
  private restScale = 1;
  private glow: Phaser.GameObjects.Image | undefined;
  private valueLabel: Phaser.GameObjects.Text | undefined;
  private readonly tweens = new Set<Phaser.Tweens.Tween>();
  private animationsPaused = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame);
    this.setActive(false).setVisible(false);
  }

  get isLocked(): boolean {
    return this.locked;
  }

  spawn(config: CoinSpawnConfig): void {
    this.id = config.id;
    this.value = config.value;
    this.source = config.source;
    this.challengeRunId = config.challengeRunId;
    this.locked = false;
    this.restScale = config.scale;
    this.animationsPaused = false;

    this.setTexture(config.assetKey)
      .setPosition(config.origin.x, config.origin.y)
      .setScale(config.scale)
      .setAngle(0)
      .setAlpha(1)
      .setDepth(50)
      .setActive(true)
      .setVisible(true);
    this.setInteractive({ useHandCursor: true });

    const label = this.scene.add
      .text(config.origin.x, config.origin.y - 20, `+${config.value}`, {
        color: config.glow ? "#fff2b0" : "#ffe28a",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "18px",
        fontStyle: "bold",
        stroke: "#4a361c",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(51);
    this.valueLabel = label;
    this.track(
      this.scene.tweens.add({
        targets: label,
        y: config.origin.y - 52,
        alpha: [1, 1, 0],
        duration: VALUE_LABEL_DURATION_MS,
        ease: "Cubic.Out",
        paused: this.animationsPaused,
        onComplete: () => {
          label.destroy();
          if (this.valueLabel === label) {
            this.valueLabel = undefined;
          }
        },
      }),
    );

    if (config.glow) {
      const glow = this.scene.add
        .image(config.origin.x, config.origin.y, config.assetKey)
        .setScale(config.scale * 1.4)
        .setAlpha(0.35)
        .setTint(0xfff2b0)
        .setDepth(49);
      this.glow = glow;
      this.track(
        this.scene.tweens.add({
          targets: glow,
          scale: config.scale * 1.7,
          alpha: 0,
          duration: GLOW_DURATION_MS,
          ease: "Sine.Out",
          paused: this.animationsPaused,
          onComplete: () => {
            glow.destroy();
            if (this.glow === glow) {
              this.glow = undefined;
            }
          },
        }),
      );
    }

    this.track(
      this.scene.tweens.add({
        targets: this,
        x: config.landing.x,
        duration: FALL_DURATION_MS,
        ease: "Quad.Out",
        paused: this.animationsPaused,
      }),
    );
    this.track(
      this.scene.tweens.add({
        targets: this,
        y: config.landing.y,
        duration: FALL_DURATION_MS,
        ease: "Quad.In",
        paused: this.animationsPaused,
        onComplete: () => this.playBounce(config.landing, config.bounces),
      }),
    );
    if (this.glow !== undefined) {
      this.track(
        this.scene.tweens.add({
          targets: this.glow,
          x: config.landing.x,
          y: config.landing.y,
          duration: FALL_DURATION_MS,
          ease: "Quad.Out",
          paused: this.animationsPaused,
        }),
      );
    }
  }

  /**
   * 尝试为拾取加锁，返回 `true` 表示本次首次锁定，调用方随后执行入账与拾取动效。
   */
  lockForPickup(): boolean {
    if (this.locked || !this.active) {
      return false;
    }
    this.locked = true;
    this.disableInteractive();
    return true;
  }

  playPickup(target: Point, onComplete: () => void): void {
    this.glow?.destroy();
    this.glow = undefined;
    this.track(
      this.scene.tweens.add({
        targets: this,
        x: target.x,
        y: target.y,
        scale: this.restScale * 0.2,
        alpha: 0.2,
        duration: PICKUP_DURATION_MS,
        ease: "Cubic.In",
        paused: this.animationsPaused,
        onComplete,
      }),
    );
  }

  setAnimationsPaused(paused: boolean): void {
    if (paused === this.animationsPaused) {
      return;
    }
    this.animationsPaused = paused;
    for (const tween of this.tweens) {
      if (paused) {
        tween.pause();
      } else {
        tween.resume();
      }
    }
  }

  recycle(): void {
    for (const tween of this.tweens) {
      tween.stop();
    }
    this.tweens.clear();
    this.glow?.destroy();
    this.glow = undefined;
    this.valueLabel?.destroy();
    this.valueLabel = undefined;
    this.removeAllListeners();
    this.disableInteractive();
    this.locked = false;
    this.challengeRunId = undefined;
    this.id = 0;
    this.value = 0;
    this.animationsPaused = false;
    this.setActive(false).setVisible(false).setScale(1).setAlpha(1).setAngle(0).setPosition(0, 0);
  }

  private playBounce(landing: Point, bounces: number): void {
    if (bounces <= 0 || !this.active) {
      return;
    }
    this.track(
      this.scene.tweens.add({
        targets: this,
        y: landing.y - BOUNCE_HEIGHT,
        duration: BOUNCE_DURATION_MS,
        ease: "Quad.Out",
        yoyo: true,
        repeat: bounces - 1,
        paused: this.animationsPaused,
      }),
    );
  }

  private track(tween: Phaser.Tweens.Tween): void {
    this.tweens.add(tween);
    tween.once(Phaser.Tweens.Events.TWEEN_COMPLETE, () => this.tweens.delete(tween));
  }
}
