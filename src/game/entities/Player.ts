import * as Phaser from "phaser";

export class Player {
  readonly image: Phaser.GameObjects.Image;
  readonly drawArm: Phaser.GameObjects.Image;
  private recoilTween: Phaser.Tweens.Tween | undefined;
  private animationsPaused = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    bodyTexture: string,
    drawArmTexture: string,
  ) {
    this.image = scene.add.image(x, y, bodyTexture).setOrigin(0.5, 1);
    this.drawArm = scene.add
      .image(x + 24, y - 134, drawArmTexture)
      .setOrigin(8 / 64, 28 / 40);
  }

  get gameObjects(): readonly Phaser.GameObjects.Image[] {
    return [this.image, this.drawArm];
  }

  playShotRecoil(): void {
    this.recoilTween?.stop();
    this.drawArm.setAngle(0);
    this.recoilTween = this.drawArm.scene.tweens.add({
      targets: this.drawArm,
      angle: 7,
      duration: 70,
      ease: "Cubic.Out",
      yoyo: true,
      paused: this.animationsPaused,
      onComplete: () => {
        this.drawArm.setAngle(0);
        this.recoilTween = undefined;
      },
    });
  }

  setAnimationsPaused(paused: boolean): void {
    if (paused === this.animationsPaused) {
      return;
    }
    this.animationsPaused = paused;
    if (paused) {
      this.recoilTween?.pause();
    } else {
      this.recoilTween?.resume();
    }
  }

  destroy(): void {
    this.recoilTween?.stop();
    this.drawArm.destroy();
    this.image.destroy();
  }
}
