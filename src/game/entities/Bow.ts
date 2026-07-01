import * as Phaser from "phaser";

export class Bow {
  readonly image: Phaser.GameObjects.Image;
  readonly string: Phaser.GameObjects.Image;
  private releaseTween: Phaser.Tweens.TweenChain | undefined;
  private animationsPaused = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    bowTexture: string,
    stringTexture: string,
    angle: number,
  ) {
    this.image = scene.add
      .image(x, y, bowTexture)
      .setOrigin(29 / 72, 0.5)
      .setAngle(angle);
    this.string = scene.add
      .image(x, y, stringTexture)
      .setOrigin(29 / 72, 0.5)
      .setAngle(angle);
  }

  get gameObjects(): readonly Phaser.GameObjects.Image[] {
    return [this.image, this.string];
  }

  setAngle(angle: number): void {
    this.image.setAngle(angle);
    this.string.setAngle(angle);
  }

  playRelease(): void {
    this.releaseTween?.stop();
    this.string.setScale(1);
    this.releaseTween = this.string.scene.tweens.chain({
      targets: this.string,
      paused: this.animationsPaused,
      tweens: [
        { scaleX: 0.08, duration: 55, ease: "Cubic.In" },
        { scaleX: 1, duration: 85, ease: "Cubic.Out" },
      ],
      onComplete: () => {
        this.string.setScale(1);
        this.releaseTween = undefined;
      },
    });
  }

  setAnimationsPaused(paused: boolean): void {
    if (paused === this.animationsPaused) {
      return;
    }
    this.animationsPaused = paused;
    if (paused) {
      this.releaseTween?.pause();
    } else {
      this.releaseTween?.resume();
    }
  }

  destroy(): void {
    this.releaseTween?.stop();
    this.string.destroy();
    this.image.destroy();
  }
}
