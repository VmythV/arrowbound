import * as Phaser from "phaser";
import { getGameServices, type GameServices } from "../GameServices";
import { ASSET_KEYS } from "../config/asset-manifest";
import { COIN_HUD_ANCHOR, GAME_WIDTH, SCENE_KEYS } from "../config/game.constants";
import { LEVEL_CONFIGS } from "../config/level.config";

export class UIScene extends Phaser.Scene {
  private services: GameServices | undefined;
  private statusText: Phaser.GameObjects.Text | undefined;
  private coinIcon: Phaser.GameObjects.Image | undefined;
  private coinsText: Phaser.GameObjects.Text | undefined;
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

    const firstLevel = LEVEL_CONFIGS[0];
    this.add
      .text(GAME_WIDTH - 42, 31, firstLevel === undefined ? "" : `第 1 关  ${firstLevel.name}`, {
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

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 675, "正在进入靶场", {
        color: "#e8ddc3",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "18px",
      })
      .setOrigin(0.5);

    this.services.events.on("game:ready", this.handleGameReady, this);
    this.services.events.on("shot:fired", this.handleShotFired, this);
    this.services.events.on("arrow:resolved", this.handleArrowResolved, this);
    this.services.events.on("coin:collected", this.handleCoinCollected, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private formatCoins(value: number): string {
    return `${Math.round(value)}`;
  }

  private handleCoinCollected({ coins }: { coins: number }): void {
    const coinsText = this.coinsText;
    if (coinsText === undefined) {
      return;
    }
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
    this.tweens.add({
      targets: this.coinIcon,
      scale: 0.58,
      duration: 100,
      ease: "Quad.Out",
      yoyo: true,
    });
  }

  private handleGameReady(): void {
    this.statusText?.setText("点击靶场或按空格键射箭");
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
    this.services?.events.off("coin:collected", this.handleCoinCollected, this);
    this.coinCountTween?.stop();
    this.coinCountTween = undefined;
    this.coinIcon = undefined;
    this.coinsText = undefined;
    this.services = undefined;
    this.statusText = undefined;
  }
}
