import * as Phaser from "phaser";
import { getGameServices, type GameServices } from "../GameServices";
import { ASSET_KEYS } from "../config/asset-manifest";
import {
  ARROW_SPAWN_POSITION,
  CHALLENGE_DURATION_SECONDS,
  COIN_HUD_ANCHOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  MINIMUM_SHOT_COOLDOWN_SECONDS,
  PLAY_AREA_BOTTOM,
  PLAY_AREA_TOP,
  PLAYER_POSITION,
  SCENE_KEYS,
} from "../config/game.constants";
import type { PendingReward } from "../state/SaveData";
import { type LevelConfig } from "../config/level.config";
import type { ShopItemId } from "../config/shop.config";
import { Bow } from "../entities/Bow";
import { Player } from "../entities/Player";
import { resolveBlessingEffects, type BlessingEffects } from "../systems/blessing-effects";
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
  private switching = false;
  private bowSpeedMultiplier = 1;

  constructor() {
    super(SCENE_KEYS.mainGame);
  }

  create(): void {
    this.switching = false;
    this.services = getGameServices(this.registry);
    const level = this.services.progression.currentConfig;
    this.level = level;
    this.services.state.setCurrentLevel(level.id);

    const background = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.meadowBackground)
      .setAlpha(0);
    this.shooting = new ShootingSystem(
      {
        bow: level.bow,
        shotCooldownSeconds: this.services.shop.shotCooldownSeconds(),
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
    this.coinIncome = this.buildCoinIncome(level);
    const ledger = this.services.ledger;
    this.coins = new CoinDropSystem(this, {
      poolTexture: ASSET_KEYS.coinBasic,
      hudAnchor: COIN_HUD_ANCHOR,
      groundY: GROUND_Y,
      onCollect: (input) => ledger.collectCoin(input),
    });
    // 已选祝福的关卡在建好系统后立即应用冷却与弓速修正。
    this.applyModifiers();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    const keyboard = this.input.keyboard;
    if (keyboard !== null) {
      keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.spaceKey.on("down", this.handleShootIntent, this);
    }
    this.services.events.on("intent:go-next-level", this.handleGoNextLevel, this);
    this.services.events.on("intent:go-previous-level", this.handleGoPreviousLevel, this);
    this.services.events.on("intent:open-shop", this.handleOpenShop, this);
    this.services.events.on("intent:close-modal", this.handleCloseModal, this);
    this.services.events.on("intent:purchase-shop-item", this.handlePurchaseShopItem, this);
    this.services.events.on("intent:select-blessing", this.handleSelectBlessing, this);
    this.services.events.on("intent:start-challenge", this.handleStartChallenge, this);
    this.services.events.on("intent:claim-reward", this.handleClaimReward, this);
    this.services.events.on("shop:changed", this.handleShopChanged, this);

    if (!this.scene.isActive(SCENE_KEYS.ui)) {
      this.scene.launch(SCENE_KEYS.ui);
    }
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
    bow.setAngle(shooting.update(delta, this.bowSpeedMultiplier));
    if (!isPaused) {
      this.projectiles?.update(delta);
    }
    this.updateChallenge(delta);
  }

  private updateChallenge(deltaMs: number): void {
    const services = this.services;
    const level = this.level;
    if (services === undefined || level === undefined) {
      return;
    }
    const snapshot = services.state.snapshot;
    if (!snapshot.isChallengeActive) {
      return;
    }
    services.state.advanceChallengeTime(deltaMs / 1_000);
    const updated = services.state.snapshot;
    if (updated.challengeCoinsCollected >= level.challengeTargetCoins) {
      this.finishChallenge(true);
    } else if (updated.challengeTimeLeft <= 0) {
      this.finishChallenge(false);
    }
  }

  private currentBlessingEffects(level: LevelConfig): BlessingEffects {
    return resolveBlessingEffects(this.services?.progression.getSelectedBlessingId(level.id));
  }

  private buildRingScoring(level: LevelConfig): RingScoringConfig {
    const blessing = this.currentBlessingEffects(level);
    return {
      baseTargetRadius: level.target.radius,
      centerRingRatio: level.target.centerRingRatio,
      preciseAimLevel: this.services?.shop.preciseAimLevel ?? 0,
      centerBlessingMultiplier: blessing.centerRadiusMultiplier,
      wideTargetMultiplier: blessing.targetRadiusMultiplier,
    };
  }

  private buildCoinIncome(level: LevelConfig): CoinIncomeContext {
    const shop = this.services?.shop;
    const blessing = this.currentBlessingEffects(level);
    return {
      greedyCoinLevel: shop?.greedyCoinLevel ?? 0,
      robotGreedLevel: shop?.robotGreedLevel ?? 0,
      allCoinMultiplier: blessing.allCoinMultiplier,
      tenRingMultiplier: blessing.tenRingMultiplier,
    };
  }

  /**
   * 依据当前商店等级与本关祝福重算环数评分、金币收益、射箭冷却与弓速。
   */
  private applyModifiers(): void {
    const services = this.services;
    const level = this.level;
    if (services === undefined || level === undefined) {
      return;
    }
    const blessing = this.currentBlessingEffects(level);
    this.projectiles?.setTargetScoring(this.buildRingScoring(level));
    this.coinIncome = this.buildCoinIncome(level);
    this.shooting?.setShotCooldownSeconds(
      services.shop.shotCooldownSeconds() * blessing.cooldownMultiplier,
    );
    this.bowSpeedMultiplier = blessing.bowSpeedMultiplier;
  }

  private readonly handleShopChanged = (): void => {
    this.applyModifiers();
  };

  private handleIntroComplete(): void {
    const services = this.services;
    const level = this.level;
    if (services === undefined || level === undefined) {
      return;
    }
    if (this.target !== undefined) {
      this.shotFeedback?.attachTarget(this.target);
    }
    if (services.progression.getSelectedBlessingId(level.id) === undefined) {
      this.beginBlessingSelection(level);
      return;
    }
    this.enterPlaying(level);
  }

  private beginBlessingSelection(level: LevelConfig): void {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    const draw = services.blessings.drawCandidates({
      hasRobot: services.shop.robotCount() > 0,
      hasCoinPet: services.shop.coinPetLevel > 0,
    });
    services.state.transitionTo("blessing_select");
    services.events.emit("blessing:offer", {
      levelId: level.id,
      candidateIds: draw.candidates.map((candidate) => candidate.id),
      usedExtraChoice: draw.usedExtraChoice,
    });
  }

  private enterPlaying(level: LevelConfig): void {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    services.state.transitionTo("playing");
    services.events.emit("level:changed", {
      levelId: level.id,
      normalCleared: services.progression.isNormalCleared(level.id),
      clearCoinGoal: level.clearCoinGoal,
    });
    services.events.emit("game:ready", { levelId: level.id });
  }

  private readonly handleSelectBlessing = ({ blessingId }: { blessingId: string }): void => {
    const services = this.services;
    const level = this.level;
    if (services === undefined || level === undefined) {
      return;
    }
    if (services.state.snapshot.phase !== "blessing_select") {
      return;
    }
    services.progression.setSelectedBlessingId(level.id, blessingId);
    this.applyModifiers();
    services.events.emit("blessing:selected", { levelId: level.id, blessingId });
    this.enterPlaying(level);
  };

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.leftButtonDown()) {
      return;
    }
    // 只有主游戏有效区域内的点击射箭，避开顶部 HUD 与底部按钮栏。
    if (pointer.y < PLAY_AREA_TOP || pointer.y > PLAY_AREA_BOTTOM) {
      return;
    }
    this.handleShootIntent();
  }

  private readonly handleGoNextLevel = (): void => {
    const services = this.services;
    if (services === undefined || this.switching) {
      return;
    }
    const snapshot = services.state.snapshot;
    if (snapshot.phase !== "playing" || snapshot.activeModal !== null) {
      return;
    }
    const progression = services.progression;
    const current = progression.currentConfig;
    if (!progression.hasNextLevel()) {
      return;
    }
    if (!progression.isNormalCleared(current.id)) {
      // 扣费、通关标记与解锁作为一次原子操作；余额不足则不做任何改动。
      if (!services.ledger.spend(current.clearCoinGoal)) {
        return;
      }
      progression.clearLevelAndUnlockNext(current.id);
    }
    this.transitionToLevel(current.id + 1);
  };

  private readonly handleGoPreviousLevel = (): void => {
    const services = this.services;
    if (services === undefined || this.switching) {
      return;
    }
    const snapshot = services.state.snapshot;
    if (snapshot.phase !== "playing" || snapshot.activeModal !== null) {
      return;
    }
    const progression = services.progression;
    if (!progression.hasPreviousLevel()) {
      return;
    }
    this.transitionToLevel(progression.currentConfig.id - 1);
  };

  private readonly handleStartChallenge = (): void => {
    const services = this.services;
    const level = this.level;
    if (services === undefined || level === undefined) {
      return;
    }
    const snapshot = services.state.snapshot;
    if (snapshot.phase !== "playing" || snapshot.activeModal !== null) {
      return;
    }
    const runId = `run-${level.id}-${Math.floor(services.random.next() * 1e9).toString(36)}`;
    services.state.startChallenge(runId, CHALLENGE_DURATION_SECONDS);
    services.events.emit("challenge:started", {
      timeLeft: CHALLENGE_DURATION_SECONDS,
      target: level.challengeTargetCoins,
    });
  };

  private finishChallenge(success: boolean): void {
    const services = this.services;
    const level = this.level;
    if (services === undefined || level === undefined) {
      return;
    }
    const score = services.state.snapshot.challengeCoinsCollected;
    // 结束运行：清 runId 并退出挑战相位，倒计时结束后拾取的金币不再计分。
    services.state.endChallengeRun();
    services.events.emit("challenge:ended", { success, score, target: level.challengeTargetCoins });

    if (!success) {
      // 失败：不扣金币、不改完成状态，返回游玩。
      services.state.transitionTo("playing");
      return;
    }

    const firstChest = !services.progression.isChallengeChestClaimed(level.id);
    services.progression.markChallengeCompleted(level.id, false);
    if (!firstChest) {
      // 重复挑战成功：不再生成宝箱，直接返回游玩。
      services.state.transitionTo("playing");
      return;
    }

    const reward = services.rewards.drawChallengeReward({
      levelId: level.id,
      clearCoinGoal: level.clearCoinGoal,
      freeUpgradeItems: services.shop.freeUpgradableItems({
        isNormalCleared: (id) => services.progression.isNormalCleared(id),
      }),
    });
    services.rewards.enqueue(reward);
    this.beginRewardPhase();
  }

  private beginRewardPhase(): void {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    const reward = services.rewards.next;
    if (reward === undefined) {
      if (services.state.snapshot.phase === "reward") {
        services.state.transitionTo("playing");
      }
      services.events.emit("reward:done", {});
      return;
    }
    if (services.state.snapshot.phase !== "reward") {
      services.state.transitionTo("reward");
    }
    services.events.emit("reward:show", { reward });
  }

  private readonly handleClaimReward = (): void => {
    const services = this.services;
    if (services === undefined || services.state.snapshot.phase !== "reward") {
      return;
    }
    const claimed = services.rewards.claimNext((reward) => this.grantReward(reward));
    if (claimed !== undefined) {
      if (claimed.source === "challenge") {
        services.progression.markChallengeCompleted(claimed.levelId, true);
      } else if (claimed.source === "lucky_first_ten") {
        services.progression.markLuckyFirstTenClaimed(claimed.levelId);
      }
    }
    this.beginRewardPhase();
  };

  private grantReward(reward: PendingReward): void {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    switch (reward.type) {
      case "coins":
        services.ledger.grantReward(reward.amount ?? 0);
        break;
      case "shop_level":
        if (reward.shopItemId !== undefined) {
          services.shop.grantLevel(reward.shopItemId, {
            isNormalCleared: (id) => services.progression.isNormalCleared(id),
          });
          this.applyModifiers();
          services.events.emit("shop:changed", {});
        }
        break;
      case "extra_blessing_choice":
        services.blessings.grantExtraChoice();
        break;
    }
  }

  private maybeTriggerLuckyFirstTen(resolution: ProjectileResolution): void {
    const services = this.services;
    const level = this.level;
    if (services === undefined || level === undefined) {
      return;
    }
    if (resolution.ring !== 10 || resolution.runtimeData.source !== "player") {
      return;
    }
    // 仅在游玩相位触发，避免中断挑战；需本关选择幸运首箭祝福且未领取过。
    if (services.state.snapshot.phase !== "playing") {
      return;
    }
    if (!this.currentBlessingEffects(level).luckyFirstTen) {
      return;
    }
    if (services.progression.isLuckyFirstTenClaimed(level.id)) {
      return;
    }
    const reward = services.rewards.drawLuckyFirstTen(level.id, level.clearCoinGoal);
    services.rewards.enqueue(reward);
    this.beginRewardPhase();
  }

  private readonly handleOpenShop = (): void => {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    const snapshot = services.state.snapshot;
    if ((snapshot.phase !== "playing" && snapshot.phase !== "challenge") || snapshot.activeModal !== null) {
      return;
    }
    services.state.openModal("shop");
  };

  private readonly handleCloseModal = (): void => {
    this.services?.state.closeModal();
  };

  private readonly handlePurchaseShopItem = ({ itemId }: { itemId: ShopItemId }): void => {
    const services = this.services;
    if (services === undefined || services.state.snapshot.activeModal !== "shop") {
      return;
    }
    const result = services.shop.tryPurchase(
      itemId,
      { isNormalCleared: (levelId) => services.progression.isNormalCleared(levelId) },
      (cost) => services.ledger.spend(cost),
    );
    if (result.status !== "ok") {
      services.events.emit("shop:purchase-failed", { itemId, reason: result.status });
      return;
    }
    this.applyModifiers();
    services.events.emit("shop:purchased", {
      itemId,
      level: result.level,
      newlyUnlocked: result.newlyUnlocked,
    });
    services.events.emit("shop:changed", {});
  };

  private transitionToLevel(targetLevelId: number): void {
    const services = this.services;
    if (services === undefined || this.switching) {
      return;
    }
    this.switching = true;
    services.state.transitionTo("level_transition");
    // 停止射箭输入并回收全部箭矢，未拾取金币自动收入钱包（不计入挑战）。
    this.projectiles?.releaseAll();
    this.coins?.drainToWallet();
    services.progression.setCurrentLevel(targetLevelId);
    services.state.setCurrentLevel(targetLevelId);
    this.cameras.main.fadeOut(260, 23, 37, 59);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart();
    });
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
    if (resolution.hit) {
      this.maybeTriggerLuckyFirstTen(resolution);
    }
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
    this.services?.events.off("intent:go-next-level", this.handleGoNextLevel, this);
    this.services?.events.off("intent:go-previous-level", this.handleGoPreviousLevel, this);
    this.services?.events.off("intent:open-shop", this.handleOpenShop, this);
    this.services?.events.off("intent:close-modal", this.handleCloseModal, this);
    this.services?.events.off("intent:purchase-shop-item", this.handlePurchaseShopItem, this);
    this.services?.events.off("intent:select-blessing", this.handleSelectBlessing, this);
    this.services?.events.off("intent:start-challenge", this.handleStartChallenge, this);
    this.services?.events.off("intent:claim-reward", this.handleClaimReward, this);
    this.services?.events.off("shop:changed", this.handleShopChanged, this);
    this.shotFeedback?.destroy();
    this.projectiles?.destroy();
    // 关卡切换时金币已在 transitionToLevel 入账；此处只销毁对象池，
    // 场景卸载会一并清理金币的文字与光圈子对象。
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
