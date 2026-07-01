import * as Phaser from "phaser";
import { getGameServices, type GameServices } from "../GameServices";
import { ASSET_KEYS } from "../config/asset-manifest";
import {
  ARROW_SPAWN_POSITION,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_POSITION,
  SCENE_KEYS,
} from "../config/game.constants";
import { LEVEL_CONFIGS } from "../config/level.config";
import { Bow } from "../entities/Bow";
import { Player } from "../entities/Player";
import { ShootingSystem } from "../systems/ShootingSystem";

const INTRO_OFFSET_X = 24;

export class MainGameScene extends Phaser.Scene {
  private services: GameServices | undefined;
  private player: Player | undefined;
  private bow: Bow | undefined;
  private shooting: ShootingSystem | undefined;

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
    this.shooting = new ShootingSystem(level.bow);
    this.player = new Player(
      this,
      PLAYER_POSITION.x - INTRO_OFFSET_X,
      PLAYER_POSITION.y,
      ASSET_KEYS.playerBody,
    );
    this.bow = new Bow(
      this,
      ARROW_SPAWN_POSITION.x - INTRO_OFFSET_X,
      ARROW_SPAWN_POSITION.y,
      ASSET_KEYS.bowBasic,
      this.shooting.bowAngle,
    );
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
      targets: [this.player.image, this.bow.image],
      x: `+=${INTRO_OFFSET_X}`,
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
    const shooting = this.shooting;
    const bow = this.bow;
    if (services === undefined || shooting === undefined || bow === undefined) {
      return;
    }
    services.clock.setPaused(services.state.snapshot.isGameplayPaused);
    services.clock.update(delta);
    if (!services.state.snapshot.isGameplayPaused) {
      bow.setAngle(shooting.update(delta));
    }
  }

  private handleIntroComplete(): void {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    services.state.transitionTo("playing");
    services.events.emit("game:ready", { levelId: services.state.snapshot.currentLevelId });
  }

  private handleShutdown(): void {
    this.services?.clock.clear();
    this.player = undefined;
    this.bow = undefined;
    this.shooting = undefined;
    this.services = undefined;
  }
}
