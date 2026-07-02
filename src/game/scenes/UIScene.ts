import * as Phaser from "phaser";
import { getGameServices, type GameServices } from "../GameServices";
import { ASSET_KEYS } from "../config/asset-manifest";
import { COIN_HUD_ANCHOR, GAME_WIDTH, SCENE_KEYS } from "../config/game.constants";
import { BLESSING_CONFIGS } from "../config/blessing.config";
import type { ShopItemId } from "../config/shop.config";
import type { GamePhase, ModalType, RuntimeState } from "../state/RuntimeState";
import type { PendingReward } from "../state/SaveData";
import { BlessingOverlay } from "../ui/BlessingOverlay";
import { RewardOverlay } from "../ui/RewardOverlay";
import { SettingsModal } from "../ui/SettingsModal";
import { ShopModal } from "../ui/ShopModal";
import { THEME } from "../config/theme";

const TITLE_FONT = THEME.fonts.display;
const BODY_FONT = THEME.fonts.body;
const BUTTON_ENABLED_COLOR = THEME.color.title;
const BUTTON_DISABLED_COLOR = THEME.color.disabled;
const BUTTON_BG = THEME.color.panelAlt;
const CTA_BG = THEME.color.ctaA;
const CTA_TEXT = "#5a2c00";

export class UIScene extends Phaser.Scene {
  private services: GameServices | undefined;
  private statusText: Phaser.GameObjects.Text | undefined;
  private levelText: Phaser.GameObjects.Text | undefined;
  private goalText: Phaser.GameObjects.Text | undefined;
  private coinIcon: Phaser.GameObjects.Image | undefined;
  private coinsText: Phaser.GameObjects.Text | undefined;
  private prevButton: Phaser.GameObjects.Text | undefined;
  private nextButton: Phaser.GameObjects.Text | undefined;
  private shopModal: ShopModal | undefined;
  private settingsModal: SettingsModal | undefined;
  private blessingOverlay: BlessingOverlay | undefined;
  private rewardOverlay: RewardOverlay | undefined;
  private challengeButton: Phaser.GameObjects.Text | undefined;
  private challengeInfo: Phaser.GameObjects.Text | undefined;
  private resultBanner: Phaser.GameObjects.Text | undefined;
  private blessingInfo: Phaser.GameObjects.Text | undefined;
  private cooldownFill: Phaser.GameObjects.Image | undefined;
  private goalFill: Phaser.GameObjects.Image | undefined;
  private coinCountTween: Phaser.Tweens.Tween | undefined;
  private displayedCoins = 0;
  private lastChallengeSecond = -1;
  private cooldownPeak = 1;
  private lastCooldownLeft = 0;

  constructor() {
    super(SCENE_KEYS.ui);
  }

  create(): void {
    this.services = getGameServices(this.registry);
    this.add.image(GAME_WIDTH / 2, 52, ASSET_KEYS.hudPanel);
    this.add.text(42, 29, "ARROWBOUND", {
      color: THEME.color.coin,
      fontFamily: TITLE_FONT,
      fontSize: "24px",
      fontStyle: "bold",
      letterSpacing: 2,
    });

    this.levelText = this.add
      .text(GAME_WIDTH - 42, 31, "", {
        color: THEME.color.title,
        fontFamily: BODY_FONT,
        fontSize: "20px",
      })
      .setOrigin(1, 0);

    this.coinIcon = this.add
      .image(COIN_HUD_ANCHOR.x, COIN_HUD_ANCHOR.y, ASSET_KEYS.coinBasic)
      .setScale(0.5);
    this.displayedCoins = this.services.ledger.coins;
    this.coinsText = this.add
      .text(COIN_HUD_ANCHOR.x + 22, COIN_HUD_ANCHOR.y, this.formatCoins(this.displayedCoins), {
        color: THEME.color.coin,
        fontFamily: BODY_FONT,
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.goalText = this.add
      .text(COIN_HUD_ANCHOR.x + 150, COIN_HUD_ANCHOR.y, "", {
        color: THEME.color.body,
        fontFamily: BODY_FONT,
        fontSize: "18px",
      })
      .setOrigin(0, 0.5);

    // 常驻目标进度条：金币旁始终显示距离本关通关目标的进度。
    this.add.image(COIN_HUD_ANCHOR.x + 22, 64, ASSET_KEYS.goalTrack).setOrigin(0, 0.5);
    this.goalFill = this.add
      .image(COIN_HUD_ANCHOR.x + 26, 64, ASSET_KEYS.goalFill)
      .setOrigin(0, 0.5)
      .setTint(THEME.hex.coin);

    this.blessingInfo = this.add
      .text(42, 104, "", {
        color: THEME.color.magic,
        fontFamily: BODY_FONT,
        fontSize: "16px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.add.image(GAME_WIDTH / 2, 636, ASSET_KEYS.cooldownTrack);
    this.cooldownFill = this.add
      .image(GAME_WIDTH / 2 - 96, 636, ASSET_KEYS.cooldownFill)
      .setOrigin(0, 0.5);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 690, "正在进入靶场", {
        color: THEME.color.body,
        fontFamily: BODY_FONT,
        fontSize: "18px",
      })
      .setOrigin(0.5);

    this.createButton(110, 682, "商店", "intent:open-shop");
    this.challengeButton = this.createButton(260, 682, "开始挑战", "intent:start-challenge");
    this.createButton(410, 682, "设置", "intent:open-settings");
    this.prevButton = this.createButton(GAME_WIDTH - 250, 682, "上一关", "intent:go-previous-level");
    this.nextButton = this.createButton(GAME_WIDTH - 110, 682, "下一关", "intent:go-next-level");
    this.shopModal = new ShopModal(this, this.services);
    this.settingsModal = new SettingsModal(this, this.services);
    this.blessingOverlay = new BlessingOverlay(this, this.services);
    this.rewardOverlay = new RewardOverlay(this, this.services);

    this.challengeInfo = this.add
      .text(GAME_WIDTH / 2, 110, "", {
        color: THEME.color.high,
        fontFamily: BODY_FONT,
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.resultBanner = this.add
      .text(GAME_WIDTH / 2, 300, "", {
        color: THEME.color.title,
        fontFamily: TITLE_FONT,
        fontSize: "40px",
        fontStyle: "bold",
        stroke: THEME.color.panel,
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(900)
      .setVisible(false);

    this.services.events.on("game:ready", this.handleGameReady, this);
    this.services.events.on("shot:fired", this.handleShotFired, this);
    this.services.events.on("arrow:resolved", this.handleArrowResolved, this);
    this.services.events.on("wallet:changed", this.handleWalletChanged, this);
    this.services.events.on("level:changed", this.handleLevelChanged, this);
    this.services.events.on("modal:changed", this.handleModalChanged, this);
    this.services.events.on("shop:changed", this.handleShopChanged, this);
    this.services.events.on("shop:purchased", this.handleShopPurchased, this);
    this.services.events.on("shop:purchase-failed", this.handleShopPurchaseFailed, this);
    this.services.events.on("blessing:offer", this.handleBlessingOffer, this);
    this.services.events.on("blessing:selected", this.handleBlessingSelected, this);
    this.services.events.on("state:changed", this.handleStateChanged, this);
    this.services.events.on("challenge:started", this.handleChallengeStarted, this);
    this.services.events.on("challenge:ended", this.handleChallengeEnded, this);
    this.services.events.on("reward:show", this.handleRewardShow, this);
    this.services.events.on("reward:done", this.handleRewardDone, this);
    this.services.events.on("settings:changed", this.handleSettingsChanged, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.refreshLevelDisplay();
  }

  private handleModalChanged({ modal }: { modal: ModalType }): void {
    if (modal === "shop") {
      this.shopModal?.open();
    } else {
      this.shopModal?.close();
    }
    if (modal === "settings") {
      this.settingsModal?.open();
    } else {
      this.settingsModal?.close();
    }
  }

  private handleShopChanged(): void {
    this.shopModal?.refresh();
  }

  private handleShopPurchased({ itemId }: { itemId: ShopItemId }): void {
    this.shopModal?.flashPurchase(itemId);
    this.shopModal?.refresh();
  }

  private handleShopPurchaseFailed({ itemId }: { itemId: ShopItemId }): void {
    this.shopModal?.flashFailure(itemId);
  }

  private handleBlessingOffer({
    candidateIds,
    usedExtraChoice,
  }: {
    candidateIds: readonly string[];
    usedExtraChoice: boolean;
  }): void {
    this.blessingOverlay?.show(candidateIds, usedExtraChoice);
  }

  private handleBlessingSelected(): void {
    this.blessingOverlay?.hide();
  }

  private handleStateChanged({ state }: { state: Readonly<RuntimeState> }): void {
    this.updateChallengeButton(state.phase);
    this.updateCooldownBar(state.shootCooldownLeft);
    if (state.isChallengeActive) {
      const seconds = Math.ceil(state.challengeTimeLeft);
      const target = this.services?.progression.currentConfig.challengeTargetCoins ?? 0;
      this.challengeInfo
        ?.setVisible(true)
        .setText(`挑战  ${state.challengeCoinsCollected} / ${target}  ·  ${seconds} 秒`)
        .setColor(seconds <= 10 ? THEME.color.danger : THEME.color.high);
      if (seconds !== this.lastChallengeSecond && seconds <= 10 && this.challengeInfo !== undefined) {
        this.tweens.add({
          targets: this.challengeInfo,
          scale: { from: 1.12, to: 1 },
          duration: 220,
          ease: "Quad.Out",
        });
      }
      this.lastChallengeSecond = seconds;
    } else {
      this.challengeInfo?.setVisible(false);
      this.lastChallengeSecond = -1;
    }
  }

  private updateCooldownBar(shootCooldownLeft: number): void {
    const fill = this.cooldownFill;
    if (fill === undefined) {
      return;
    }
    // 冷却刚开始（剩余时间跳增）时记录本次峰值，随后线性恢复。
    if (shootCooldownLeft > this.lastCooldownLeft) {
      this.cooldownPeak = Math.max(shootCooldownLeft, 0.001);
    }
    this.lastCooldownLeft = shootCooldownLeft;
    const readyFraction =
      shootCooldownLeft <= 0 ? 1 : 1 - Math.min(1, shootCooldownLeft / this.cooldownPeak);
    fill.setScale(Math.max(0.001, readyFraction), 1);
    fill.setTint(readyFraction >= 1 ? THEME.hex.ok : THEME.hex.ctaB);
  }

  private updateChallengeButton(phase: GamePhase): void {
    const button = this.challengeButton;
    if (button === undefined) {
      return;
    }
    const enabled = phase === "playing";
    button.setAlpha(enabled ? 1 : 0.45);
    if (enabled) {
      button.setInteractive({ useHandCursor: true });
    } else {
      button.disableInteractive();
      button.setScale(1);
    }
  }

  private handleChallengeStarted({ target }: { target: number }): void {
    this.challengeInfo?.setVisible(true).setText(`挑战  0 / ${target}`);
  }

  private handleChallengeEnded({ success }: { success: boolean }): void {
    this.challengeInfo?.setVisible(false);
    this.showResultBanner(success ? "挑战成功" : "挑战失败", success ? THEME.color.ok : THEME.color.high);
  }

  private showResultBanner(text: string, color: string): void {
    const banner = this.resultBanner;
    if (banner === undefined) {
      return;
    }
    banner.setText(text).setColor(color).setVisible(true).setAlpha(0).setScale(0.9);
    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.9, to: 1 },
      duration: 220,
      ease: "Back.Out",
      hold: 700,
      yoyo: true,
      onComplete: () => banner.setVisible(false),
    });
  }

  private handleRewardShow({ reward }: { reward: PendingReward }): void {
    this.rewardOverlay?.show(reward);
  }

  private handleRewardDone(): void {
    this.rewardOverlay?.hide();
  }

  private handleSettingsChanged(): void {
    this.settingsModal?.refresh();
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    intent:
      | "intent:go-next-level"
      | "intent:go-previous-level"
      | "intent:open-shop"
      | "intent:open-settings"
      | "intent:start-challenge",
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        color: BUTTON_ENABLED_COLOR,
        fontFamily: BODY_FONT,
        fontSize: "20px",
        fontStyle: "bold",
        backgroundColor: BUTTON_BG,
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (button.input?.enabled === true) {
        button.setScale(1.04);
      }
    });
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setScale(1));
    button.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (button.input?.enabled !== true) {
        return;
      }
      button.setScale(0.97);
      this.services?.events.emit(intent, {});
    });
    button.on(Phaser.Input.Events.POINTER_UP, () => button.setScale(1));
    return button;
  }

  private setButtonEnabled(button: Phaser.GameObjects.Text | undefined, enabled: boolean): void {
    if (button === undefined) {
      return;
    }
    button.setColor(enabled ? BUTTON_ENABLED_COLOR : BUTTON_DISABLED_COLOR);
    button.setAlpha(enabled ? 1 : 0.55);
    if (enabled) {
      button.setInteractive({ useHandCursor: true });
    } else {
      button.disableInteractive();
      button.setScale(1);
    }
  }

  private refreshLevelDisplay(): void {
    const services = this.services;
    if (services === undefined) {
      return;
    }
    const progression = services.progression;
    const level = progression.currentConfig;
    const cleared = progression.isNormalCleared(level.id);
    const coins = services.ledger.coins;

    this.levelText?.setText(`第 ${level.id} 关  ${level.name}`);
    this.goalText?.setText(
      cleared ? `通关目标 ${level.clearCoinGoal} · 已通关` : `通关目标 ${level.clearCoinGoal}`,
    );

    // 目标进度条：达标或已通关时填满并转为成功绿，牵引玩家继续。
    const goalFraction =
      cleared || level.clearCoinGoal <= 0 ? 1 : Math.max(0, Math.min(1, coins / level.clearCoinGoal));
    this.goalFill?.setScale(Math.max(0.001, goalFraction), 1).setTint(goalFraction >= 1 ? THEME.hex.ok : THEME.hex.coin);

    const canAdvance = progression.hasNextLevel() && (cleared || coins >= level.clearCoinGoal);
    // 未通关时在按钮上标出通关会扣除的金币，帮玩家决定先囤钱还是先通关。
    this.nextButton?.setText(cleared ? "下一关" : `确认通关 -${level.clearCoinGoal}`);
    this.setButtonEnabled(this.nextButton, canAdvance);
    // 够钱可通关时，「下一关」变暖橙 CTA 主行动，召唤玩家点击。
    if (this.nextButton !== undefined) {
      this.nextButton.setBackgroundColor(canAdvance ? CTA_BG : BUTTON_BG);
      this.nextButton.setColor(canAdvance ? CTA_TEXT : BUTTON_DISABLED_COLOR);
    }
    this.setButtonEnabled(this.prevButton, progression.hasPreviousLevel());

    // 本关挑战宝箱已领取时在挑战按钮标注，避免误以为重复挑战仍有宝箱。
    this.challengeButton?.setText(
      progression.isChallengeChestClaimed(level.id) ? "挑战·宝箱已领" : "开始挑战",
    );

    const blessingId = progression.getSelectedBlessingId(level.id);
    const blessingName = BLESSING_CONFIGS.find((config) => config.id === blessingId)?.name;
    if (blessingName === undefined) {
      this.blessingInfo?.setVisible(false);
    } else {
      this.blessingInfo?.setVisible(true).setText(`本关祝福：${blessingName}`);
    }
  }

  private formatCoins(value: number): string {
    return `${Math.round(value)}`;
  }

  private handleWalletChanged({ coins, reason }: { coins: number; reason: string }): void {
    const coinsText = this.coinsText;
    if (coinsText !== undefined) {
      this.coinCountTween?.stop();
      const from = this.displayedCoins;
      this.displayedCoins = coins;
      this.coinCountTween = this.tweens.addCounter({
        from,
        to: coins,
        duration: 200,
        ease: "Cubic.Out",
        onUpdate: (tween) => coinsText.setText(this.formatCoins(tween.getValue() ?? coins)),
        onComplete: () => coinsText.setText(this.formatCoins(coins)),
      });
      if (reason === "collect") {
        this.tweens.add({
          targets: this.coinIcon,
          scale: 0.58,
          duration: 100,
          ease: "Quad.Out",
          yoyo: true,
        });
      }
    }
    if (this.shopModal?.isOpen === true) {
      this.shopModal.refresh();
    }
    this.refreshLevelDisplay();
  }

  private handleLevelChanged(): void {
    this.refreshLevelDisplay();
  }

  private handleGameReady(): void {
    this.statusText?.setText("点击靶场或按空格键射箭");
    this.refreshLevelDisplay();
  }

  private handleShotFired(): void {
    this.statusText?.setText("箭矢已射出");
  }

  private handleArrowResolved({ hit }: { hit: boolean }): void {
    this.statusText?.setText(hit ? "命中靶面" : "脱靶");
  }

  private handleShutdown(): void {
    this.services?.events.off("game:ready", this.handleGameReady, this);
    this.services?.events.off("shot:fired", this.handleShotFired, this);
    this.services?.events.off("arrow:resolved", this.handleArrowResolved, this);
    this.services?.events.off("wallet:changed", this.handleWalletChanged, this);
    this.services?.events.off("level:changed", this.handleLevelChanged, this);
    this.services?.events.off("modal:changed", this.handleModalChanged, this);
    this.services?.events.off("shop:changed", this.handleShopChanged, this);
    this.services?.events.off("shop:purchased", this.handleShopPurchased, this);
    this.services?.events.off("shop:purchase-failed", this.handleShopPurchaseFailed, this);
    this.services?.events.off("blessing:offer", this.handleBlessingOffer, this);
    this.services?.events.off("blessing:selected", this.handleBlessingSelected, this);
    this.services?.events.off("state:changed", this.handleStateChanged, this);
    this.services?.events.off("challenge:started", this.handleChallengeStarted, this);
    this.services?.events.off("challenge:ended", this.handleChallengeEnded, this);
    this.services?.events.off("reward:show", this.handleRewardShow, this);
    this.services?.events.off("reward:done", this.handleRewardDone, this);
    this.services?.events.off("settings:changed", this.handleSettingsChanged, this);
    this.coinCountTween?.stop();
    this.coinCountTween = undefined;
    this.shopModal?.destroy();
    this.shopModal = undefined;
    this.settingsModal?.destroy();
    this.settingsModal = undefined;
    this.blessingOverlay?.destroy();
    this.blessingOverlay = undefined;
    this.rewardOverlay?.destroy();
    this.rewardOverlay = undefined;
    this.challengeButton = undefined;
    this.challengeInfo = undefined;
    this.resultBanner = undefined;
    this.blessingInfo = undefined;
    this.cooldownFill = undefined;
    this.goalFill = undefined;
    this.coinIcon = undefined;
    this.coinsText = undefined;
    this.levelText = undefined;
    this.goalText = undefined;
    this.prevButton = undefined;
    this.nextButton = undefined;
    this.services = undefined;
    this.statusText = undefined;
  }
}
