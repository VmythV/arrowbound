import * as Phaser from "phaser";

export class Player {
  readonly image: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
  ) {
    this.image = scene.add.image(x, y, texture).setOrigin(0.5, 1);
  }

  destroy(): void {
    this.image.destroy();
  }
}
