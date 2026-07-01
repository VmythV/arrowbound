import * as Phaser from "phaser";
import { getGameServices, type GameServices } from "../GameServices";
import { ASSET_KEYS } from "../config/asset-manifest";
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_POSITION, SCENE_KEYS } from "../config/game.constants";
import { LEVEL_CONFIGS } from "../config/level.config";

export class MainGameScene extends Phaser.Scene {
  private services: GameServices | undefined;

  constructor() {
    super(SCENE_KEYS.mainGame);
  }

  create(): void {
    this.services = getGameServices(this.registry);
    const level = LEVEL_CONFIGS[0];
    if (level === undefined) {
      throw new Error("The first level configuration is missing");
    }

    const background = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.meadowBackground)
      .setAlpha(0);
    const player = this.add
      .image(PLAYER_POSITION.x - 24, PLAYER_POSITION.y, ASSET_KEYS.playerBody)
      .setOrigin(0.5, 1);
    const bow = this.add
      .image(PLAYER_POSITION.x + 35, PLAYER_POSITION.y - 145, ASSET_KEYS.bowBasic)
      .setRotation(Phaser.Math.DegToRad(-14));
    const target = this.add
      .image(level.target.x + 28, level.target.y, ASSET_KEYS.targetBasic)
      .setOrigin(0.5, 90 / 220);

    this.scene.launch(SCENE_KEYS.ui);
    this.cameras.main.fadeIn(300, 23, 37, 59);
    this.tweens.add({
      targets: background,
      alpha: 1,
      duration: 300,
      ease: "Cubic.Out",
    });
    this.tweens.add({
      targets: [player, bow],
      x: "+=24",
      duration: 300,
      ease: "Cubic.Out",
    });
    this.tweens.add({
      targets: target,
      x: level.target.x,
      duration: 300,
      ease: "Cubic.Out",
      onComplete: this.handleIntroComplete,
      callbackScope: this,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  override update(_time: number, delta: number): void {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    services.clock.setPaused(services.state.snapshot.isGameplayPaused);
    services.clock.update(delta);
  }

  private handleIntroComplete(): void {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    services.state.transitionTo("blessing_select");
    services.events.emit("game:ready", { levelId: services.state.snapshot.currentLevelId });
  }

  private handleShutdown(): void {
    this.services?.clock.clear();
    this.services = undefined;
  }
}
