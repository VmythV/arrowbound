import * as Phaser from "phaser";
import type { Point } from "../utils/ballistics";

type ActiveEffect = {
  readonly objects: readonly Phaser.GameObjects.GameObject[];
  readonly tweens: readonly Phaser.Tweens.Tween[];
};

export type HitSource = "player" | "robot";

type HitTier = {
  readonly sparkScale: number;
  readonly sparkTint: number;
  readonly textColor: string;
  readonly textScale: number;
  readonly durationMs: number;
  readonly shakePixels: number;
  readonly ripple: boolean;
  readonly targetNudgePixels: number;
  readonly targetBounce: boolean;
};

export type ShotFeedbackTextures = {
  readonly missDust: string;
  readonly hitSpark: string;
};

const CHINESE_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"] as const;

function ringLabel(ring: number): string {
  const digit = CHINESE_DIGITS[ring];
  return digit === undefined ? `${ring}环` : `${digit}环`;
}

function classifyHitTier(ring: number, source: HitSource): HitTier {
  if (ring >= 10) {
    return source === "player"
      ? {
          sparkScale: 1.15,
          sparkTint: 0xfff3c4,
          textColor: "#ffe06a",
          textScale: 1.5,
          durationMs: 580,
          shakePixels: 4,
          ripple: true,
          targetNudgePixels: 0,
          targetBounce: true,
        }
      : {
          sparkScale: 0.85,
          sparkTint: 0xffe6a0,
          textColor: "#ffe6a0",
          textScale: 1.1,
          durationMs: 280,
          shakePixels: 0,
          ripple: false,
          targetNudgePixels: 0,
          targetBounce: false,
        };
  }
  if (source === "robot") {
    return {
      sparkScale: 0.6,
      sparkTint: 0xd8e2ea,
      textColor: "#dbe6ef",
      textScale: 0.95,
      durationMs: 220,
      shakePixels: 0,
      ripple: false,
      targetNudgePixels: 0,
      targetBounce: false,
    };
  }
  if (ring >= 7) {
    return {
      sparkScale: 0.9,
      sparkTint: 0xffe27a,
      textColor: "#ffe98c",
      textScale: 1.2,
      durationMs: 300,
      shakePixels: 0,
      ripple: false,
      targetNudgePixels: 0,
      targetBounce: false,
    };
  }
  if (ring >= 4) {
    return {
      sparkScale: 0.7,
      sparkTint: 0xf2d79a,
      textColor: "#f6e2a8",
      textScale: 1.05,
      durationMs: 220,
      shakePixels: 0,
      ripple: false,
      targetNudgePixels: 1,
      targetBounce: false,
    };
  }
  return {
    sparkScale: 0.5,
    sparkTint: 0xcfe6d8,
    textColor: "#dfeee4",
    textScale: 1,
    durationMs: 180,
    shakePixels: 0,
    ripple: false,
    targetNudgePixels: 0,
    targetBounce: false,
  };
}

export class ShotFeedbackSystem {
  private readonly effects = new Set<ActiveEffect>();
  private activeMiss: ActiveEffect | undefined;
  private paused = false;
  private target: Phaser.GameObjects.Image | undefined;
  private targetOriginX = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly textures: ShotFeedbackTextures,
    private readonly groundY: number,
    private readonly gameWidth: number,
  ) {}

  /**
   * 记录靶子精灵，用于命中时的位移和回弹表现。
   */
  attachTarget(target: Phaser.GameObjects.Image): void {
    this.target = target;
    this.targetOriginX = target.x;
  }

  showMiss(point: Point): void {
    this.disposeMiss();
    const x = Phaser.Math.Clamp(point.x, 64, this.gameWidth - 64);
    const y = Phaser.Math.Clamp(point.y, 120, this.groundY);
    const dust = this.scene.add
      .image(x, y, this.textures.missDust)
      .setOrigin(0.5, 1)
      .setScale(0.65)
      .setAlpha(0.9);
    const label = this.scene.add
      .text(x, y - 48, "脱靶", {
        color: "#f8f1dc",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "20px",
        fontStyle: "bold",
        stroke: "#273842",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const tweens: Phaser.Tweens.Tween[] = [];
    const effect: ActiveEffect = { objects: [dust, label], tweens };
    tweens.push(
      this.scene.tweens.add({
        targets: dust,
        y: y - 6,
        scale: 1,
        alpha: 0,
        duration: 300,
        ease: "Quad.Out",
        paused: this.paused,
        onComplete: () => this.dispose(effect),
      }),
      this.scene.tweens.add({
        targets: label,
        y: y - 66,
        alpha: [0, 1, 1, 0],
        duration: 300,
        ease: "Cubic.Out",
        paused: this.paused,
      }),
    );
    this.activeMiss = effect;
    this.effects.add(effect);
  }

  showHit(point: Point, ring: number, source: HitSource): void {
    if (ring < 1) {
      return;
    }
    const tier = classifyHitTier(ring, source);
    const tweens: Phaser.Tweens.Tween[] = [];
    const objects: Phaser.GameObjects.GameObject[] = [];

    const spark = this.scene.add
      .image(point.x, point.y, this.textures.hitSpark)
      .setScale(tier.sparkScale * 0.6)
      .setTint(tier.sparkTint)
      .setAlpha(0.95);
    objects.push(spark);
    const effect: ActiveEffect = { objects, tweens };
    tweens.push(
      this.scene.tweens.add({
        targets: spark,
        scale: tier.sparkScale,
        alpha: 0,
        duration: tier.durationMs,
        ease: "Quad.Out",
        paused: this.paused,
        onComplete: () => this.dispose(effect),
      }),
    );

    const label = this.scene.add
      .text(point.x, point.y - 34, ringLabel(ring), {
        color: tier.textColor,
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "22px",
        fontStyle: "bold",
        stroke: "#273842",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScale(tier.textScale * 0.85)
      .setAlpha(0);
    objects.push(label);
    tweens.push(
      this.scene.tweens.add({
        targets: label,
        y: point.y - 34 - 22 * tier.textScale,
        scale: tier.textScale,
        alpha: [0, 1, 1, 0],
        duration: tier.durationMs,
        ease: "Cubic.Out",
        paused: this.paused,
      }),
    );

    if (tier.ripple) {
      const ripple = this.scene.add
        .image(point.x, point.y, this.textures.hitSpark)
        .setScale(0.4)
        .setTint(0xfff0b8)
        .setAlpha(0.7);
      objects.push(ripple);
      tweens.push(
        this.scene.tweens.add({
          targets: ripple,
          scale: 2.2,
          alpha: 0,
          duration: tier.durationMs,
          ease: "Sine.Out",
          paused: this.paused,
        }),
      );
    }

    if (this.target !== undefined) {
      if (tier.targetBounce) {
        tweens.push(
          this.scene.tweens.add({
            targets: this.target,
            scale: 1.08,
            duration: 140,
            ease: "Sine.Out",
            yoyo: true,
            paused: this.paused,
          }),
        );
      } else if (tier.targetNudgePixels > 0) {
        this.target.x = this.targetOriginX;
        tweens.push(
          this.scene.tweens.add({
            targets: this.target,
            x: this.targetOriginX + tier.targetNudgePixels,
            duration: 90,
            ease: "Sine.InOut",
            yoyo: true,
            paused: this.paused,
          }),
        );
      }
    }

    if (tier.shakePixels > 0 && !this.paused) {
      this.scene.cameras.main.shake(120, tier.shakePixels / this.gameWidth);
    }

    this.effects.add(effect);
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) {
      return;
    }
    this.paused = paused;
    for (const effect of this.effects) {
      for (const tween of effect.tweens) {
        if (paused) {
          tween.pause();
        } else {
          tween.resume();
        }
      }
    }
  }

  destroy(): void {
    for (const effect of [...this.effects]) {
      this.dispose(effect);
    }
    this.activeMiss = undefined;
    this.target = undefined;
  }

  private disposeMiss(): void {
    if (this.activeMiss !== undefined) {
      this.dispose(this.activeMiss);
    }
  }

  private dispose(effect: ActiveEffect): void {
    if (!this.effects.delete(effect)) {
      return;
    }
    if (effect === this.activeMiss) {
      this.activeMiss = undefined;
    }
    for (const tween of effect.tweens) {
      tween.stop();
    }
    for (const object of effect.objects) {
      object.destroy();
    }
  }
}
