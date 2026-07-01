import * as Phaser from "phaser";
import { getGameServices, type GameServices } from "../GameServices";
import { ASSET_KEYS } from "../config/asset-manifest";
import {
  ARROW_SPAWN_POSITION,
  COIN_HUD_ANCHOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  INITIAL_SHOT_COOLDOWN_SECONDS,
  MINIMUM_SHOT_COOLDOWN_SECONDS,
  PLAYER_POSITION,
  SCENE_KEYS,
} from "../config/game.constants";
import { LEVEL_CONFIGS, type LevelConfig } from "../config/level.config";
import { Bow } from "../entities/Bow";
import { Player } from "../entities/Player";
import { CoinDropSystem } from "../systems/CoinDropSystem";
import { computeCoinValue, type CoinIncomeContext } from "../systems/coin-income";
import { ProjectileSystem, type ProjectileResolution } from "../systems/ProjectileSystem";
import type { RingScoringConfig } from "../systems/ring-scoring";
import { ShotFeedbackSystem } from "../systems/ShotFeedbackSystem";
import { ShootingSystem } from "../systems/ShootingSystem";

const INTRO_OFFSET_X = 24;

export class MainGameScene extends Phaser.Scene {
  private services: GameServices | undefined;
  private player: Player | undefined;
  private bow: Bow | undefined;
  private shooting: ShootingSystem | undefined;
  private projectiles: ProjectileSystem | undefined;
  private shotFeedback: ShotFeedbackSystem | undefined;
  private coins: CoinDropSystem | undefined;
  private coinIncome: CoinIncomeContext | undefined;
  private target: Phaser.GameObjects.Image | undefined;
  private level: LevelConfig | undefined;
  private spaceKey: Phaser.Input.Keyboard.Key | undefined;

  constructor() {
    super(SCENE_KEYS.mainGame);
  }

  create(): void {
    this.services = getGameServices(this.registry);
    const level = LEVEL_CONFIGS[0];
    if (level === undefined) {
      throw new Error("The first level configuration is missing");
    }
    this.level = level;

    const background = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.meadowBackground)
      .setAlpha(0);
    this.shooting = new ShootingSystem(
      {
        bow: level.bow,
        shotCooldownSeconds: INITIAL_SHOT_COOLDOWN_SECONDS,
        minimumShotCooldownSeconds: MINIMUM_SHOT_COOLDOWN_SECONDS,
      },
      this.services.state,
    );
    this.player = new Player(
      this,
      PLAYER_POSITION.x - INTRO_OFFSET_X,
      PLAYER_POSITION.y,
      ASSET_KEYS.playerBody,
      ASSET_KEYS.playerDrawArm,
    );
    this.bow = new Bow(
      this,
      ARROW_SPAWN_POSITION.x - INTRO_OFFSET_X,
      ARROW_SPAWN_POSITION.y,
      ASSET_KEYS.bowBasic,
      ASSET_KEYS.bowStringBasic,
      this.shooting.bowAngle,
    );
    const target = this.add
      .image(level.target.x + 28, level.target.y, ASSET_KEYS.targetBasic)
      .setOrigin(0.5, 90 / 220);
    this.target = target;
    const scoring = this.buildRingScoring(level);
    this.projectiles = new ProjectileSystem(this, {
      texture: ASSET_KEYS.arrowBasic,
      target: { x: level.target.x, y: level.target.y, scoring },
      bounds: {
        left: -160,
        right: GAME_WIDTH + 160,
        top: -160,
        bottom: GROUND_Y,
      },
      onResolved: this.handleProjectileResolved,
    });
    this.shotFeedback = new ShotFeedbackSystem(
      this,
      { missDust: ASSET_KEYS.missDust, hitSpark: ASSET_KEYS.hitSpark },
      GROUND_Y,
      GAME_WIDTH,
    );
    this.coinIncome = this.buildCoinIncome();
    const ledger = this.services.ledger;
    this.coins = new CoinDropSystem(this, {
      poolTexture: ASSET_KEYS.coinBasic,
      hudAnchor: COIN_HUD_ANCHOR,
      groundY: GROUND_Y,
      onCollect: (input) => ledger.collectCoin(input),
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    const keyboard = this.input.keyboard;
    if (keyboard !== null) {
      keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.spaceKey.on("down", this.handleShootIntent, this);
    }

    this.scene.launch(SCENE_KEYS.ui);
    this.cameras.main.fadeIn(300, 23, 37, 59);
    this.tweens.add({
      targets: background,
      alpha: 1,
      duration: 300,
      ease: "Cubic.Out",
    });
    this.tweens.add({
      targets: [...this.player.gameObjects, ...this.bow.gameObjects],
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
    const isPaused = services.state.snapshot.isGameplayPaused;
    services.clock.setPaused(isPaused);
    services.clock.update(delta);
    this.player?.setAnimationsPaused(isPaused);
    bow.setAnimationsPaused(isPaused);
    this.projectiles?.setAnimationsPaused(isPaused);
    this.shotFeedback?.setPaused(isPaused);
    this.coins?.setPaused(isPaused);
    bow.setAngle(shooting.update(delta));
    if (!isPaused) {
      this.projectiles?.update(delta);
    }
  }

  private buildRingScoring(level: LevelConfig): RingScoringConfig {
    // 商店等级与祝福倍率由后续阶段接入，当前使用无加成的基础值。
    return {
      baseTargetRadius: level.target.radius,
      centerRingRatio: level.target.centerRingRatio,
      preciseAimLevel: 0,
      centerBlessingMultiplier: 1,
      wideTargetMultiplier: 1,
    };
  }

  private buildCoinIncome(): CoinIncomeContext {
    // 商店等级与金币祝福由后续阶段接入，当前使用无加成的基础倍率。
    return {
      greedyCoinLevel: 0,
      robotGreedLevel: 0,
      allCoinMultiplier: 1,
      tenRingMultiplier: 1,
    };
  }

  private handleIntroComplete(): void {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    if (this.target !== undefined) {
      this.shotFeedback?.attachTarget(this.target);
    }
    services.state.transitionTo("playing");
    services.events.emit("game:ready", { levelId: services.state.snapshot.currentLevelId });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.leftButtonDown()) {
      this.handleShootIntent();
    }
  }

  private handleShootIntent(): void {
    const services = this.services;
    const shooting = this.shooting;
    const projectiles = this.projectiles;
    const level = this.level;
    if (services === undefined || shooting === undefined || projectiles === undefined || level === undefined) {
      return;
    }

    const shot = shooting.tryShoot(level.arrow.speed);
    if (shot === null) {
      return;
    }
    projectiles.launch({
      origin: ARROW_SPAWN_POSITION,
      velocity: shot.velocity,
      gravity: level.arrow.gravity,
      runtimeData: { source: "player" },
    });
    this.bow?.playRelease();
    this.player?.playShotRecoil();
    services.events.emit("shot:fired", { angle: shot.angle });
  }

  private readonly handleProjectileResolved = (resolution: ProjectileResolution): void => {
    if (resolution.hit) {
      this.shotFeedback?.showHit(resolution.point, resolution.ring, resolution.runtimeData.source);
      this.spawnCoinForHit(resolution);
    } else {
      this.shotFeedback?.showMiss(resolution.point);
    }
    this.services?.events.emit("arrow:resolved", resolution);
  };

  private spawnCoinForHit(resolution: ProjectileResolution): void {
    const coins = this.coins;
    const income = this.coinIncome;
    if (coins === undefined || income === undefined) {
      return;
    }
    const source = resolution.runtimeData.source;
    const value = computeCoinValue(resolution.ring, source, income);
    if (value <= 0) {
      return;
    }
    const challengeRunId = this.services?.state.snapshot.challengeRunId;
    coins.spawn({
      origin: resolution.point,
      value,
      source,
      ...(challengeRunId !== undefined ? { challengeRunId } : {}),
    });
  }

  private handleShutdown(): void {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.spaceKey?.off("down", this.handleShootIntent, this);
    this.shotFeedback?.destroy();
    this.projectiles?.destroy();
    this.coins?.releaseAll();
    this.coins?.destroy();
    this.services?.ledger.resetLevelTracking();
    this.services?.clock.clear();
    this.player = undefined;
    this.bow = undefined;
    this.shooting = undefined;
    this.projectiles = undefined;
    this.shotFeedback = undefined;
    this.coins = undefined;
    this.coinIncome = undefined;
    this.target = undefined;
    this.level = undefined;
    this.spaceKey = undefined;
    this.services = undefined;
  }
}
