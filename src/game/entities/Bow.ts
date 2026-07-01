import * as Phaser from "phaser";

export class Bow {
  readonly image: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    angle: number,
  ) {
    this.image = scene.add.image(x, y, texture).setAngle(angle);
  }

  setAngle(angle: number): void {
    this.image.setAngle(angle);
  }

  destroy(): void {
    this.image.destroy();
  }
}
