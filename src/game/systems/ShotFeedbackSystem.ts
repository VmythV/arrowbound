import * as Phaser from "phaser";
import type { Point } from "../utils/ballistics";

type ActiveMissFeedback = {
  readonly dust: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  readonly tweens: readonly Phaser.Tweens.Tween[];
};

export class ShotFeedbackSystem {
  private activeMiss: ActiveMissFeedback | undefined;
  private paused = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly missDustTexture: string,
    private readonly groundY: number,
    private readonly gameWidth: number,
  ) {}

  showMiss(point: Point): void {
    this.clearMiss();
    const x = Phaser.Math.Clamp(point.x, 64, this.gameWidth - 64);
    const y = Phaser.Math.Clamp(point.y, 120, this.groundY);
    const dust = this.scene.add
      .image(x, y, this.missDustTexture)
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

    const dustTween = this.scene.tweens.add({
      targets: dust,
      y: y - 6,
      scale: 1,
      alpha: 0,
      duration: 300,
      ease: "Quad.Out",
      paused: this.paused,
      onComplete: () => this.clearMiss(),
    });
    const labelTween = this.scene.tweens.add({
      targets: label,
      y: y - 66,
      alpha: [0, 1, 1, 0],
      duration: 300,
      ease: "Cubic.Out",
      paused: this.paused,
    });
    this.activeMiss = { dust, label, tweens: [dustTween, labelTween] };
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) {
      return;
    }
    this.paused = paused;
    for (const tween of this.activeMiss?.tweens ?? []) {
      if (paused) {
        tween.pause();
      } else {
        tween.resume();
      }
    }
  }

  destroy(): void {
    this.clearMiss();
  }

  private clearMiss(): void {
    const feedback = this.activeMiss;
    this.activeMiss = undefined;
    if (feedback === undefined) {
      return;
    }
    for (const tween of feedback.tweens) {
      tween.stop();
    }
    feedback.dust.destroy();
    feedback.label.destroy();
  }
}
