import * as Phaser from "phaser";
import { getGameServices, type GameServices } from "../GameServices";
import { ASSET_KEYS } from "../config/asset-manifest";
import { COIN_HUD_ANCHOR, GAME_WIDTH, SCENE_KEYS } from "../config/game.constants";

const BUTTON_ENABLED_COLOR = "#f8f1dc";
const BUTTON_DISABLED_COLOR = "#7c8b93";

export class UIScene extends Phaser.Scene {
  private services: GameServices | undefined;
  private statusText: Phaser.GameObjects.Text | undefined;
  private levelText: Phaser.GameObjects.Text | undefined;
  private goalText: Phaser.GameObjects.Text | undefined;
  private coinIcon: Phaser.GameObjects.Image | undefined;
  private coinsText: Phaser.GameObjects.Text | undefined;
  private prevButton: Phaser.GameObjects.Text | undefined;
  private nextButton: Phaser.GameObjects.Text | undefined;
  private coinCountTween: Phaser.Tweens.Tween | undefined;
  private displayedCoins = 0;

  constructor() {
    super(SCENE_KEYS.ui);
  }

  create(): void {
    this.services = getGameServices(this.registry);
    this.add.image(GAME_WIDTH / 2, 52, ASSET_KEYS.hudPanel);
    this.add.text(42, 29, "ARROWBOUND", {
      color: "#fff1bd",
      fontFamily: "Georgia, serif",
      fontSize: "24px",
      fontStyle: "bold",
      letterSpacing: 2,
    });

    this.levelText = this.add
      .text(GAME_WIDTH - 42, 31, "", {
        color: "#f8f1dc",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "20px",
      })
      .setOrigin(1, 0);

    this.coinIcon = this.add
      .image(COIN_HUD_ANCHOR.x, COIN_HUD_ANCHOR.y, ASSET_KEYS.coinBasic)
      .setScale(0.5);
    this.displayedCoins = this.services.ledger.coins;
    this.coinsText = this.add
      .text(COIN_HUD_ANCHOR.x + 22, COIN_HUD_ANCHOR.y, this.formatCoins(this.displayedCoins), {
        color: "#ffe9a0",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.goalText = this.add
      .text(COIN_HUD_ANCHOR.x + 150, COIN_HUD_ANCHOR.y, "", {
        color: "#e8ddc3",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "18px",
      })
      .setOrigin(0, 0.5);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 690, "正在进入靶场", {
        color: "#e8ddc3",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "18px",
      })
      .setOrigin(0.5);

    this.prevButton = this.createButton(GAME_WIDTH - 250, 682, "上一关", "intent:go-previous-level");
    this.nextButton = this.createButton(GAME_WIDTH - 110, 682, "下一关", "intent:go-next-level");

    this.services.events.on("game:ready", this.handleGameReady, this);
    this.services.events.on("shot:fired", this.handleShotFired, this);
    this.services.events.on("arrow:resolved", this.handleArrowResolved, this);
    this.services.events.on("wallet:changed", this.handleWalletChanged, this);
    this.services.events.on("level:changed", this.handleLevelChanged, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.refreshLevelDisplay();
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    intent: "intent:go-next-level" | "intent:go-previous-level",
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        color: BUTTON_ENABLED_COLOR,
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "20px",
        fontStyle: "bold",
        backgroundColor: "#2c3e49",
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

    const canAdvance = progression.hasNextLevel() && (cleared || coins >= level.clearCoinGoal);
    this.nextButton?.setText(cleared ? "下一关" : "确认通关");
    this.setButtonEnabled(this.nextButton, canAdvance);
    this.setButtonEnabled(this.prevButton, progression.hasPreviousLevel());
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
    this.coinCountTween?.stop();
    this.coinCountTween = undefined;
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
