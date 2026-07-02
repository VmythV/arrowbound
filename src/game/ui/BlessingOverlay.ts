import * as Phaser from "phaser";
import { ASSET_KEYS } from "../config/asset-manifest";
import { BLESSING_CONFIGS, type BlessingConfig } from "../config/blessing.config";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/game.constants";
import type { GameServices } from "../GameServices";

const CARD_WIDTH = 220;
const CARD_GAP = 28;
const CARD_CENTER_Y = 380;
const BODY_FONT = 'Inter, "Noto Sans SC", sans-serif';

const CONFIG_BY_ID = new Map<string, BlessingConfig>(
  BLESSING_CONFIGS.map((config) => [config.id, config]),
);

/**
 * 关卡祝福选择界面。展示 3 或 4 张候选卡片，点击卡片发出选择意图，
 * 由 MainGameScene 保存到该关并进入游玩。选择本身即暂停主游戏（blessing_select 相位）。
 */
export class BlessingOverlay {
  private readonly scrim: Phaser.GameObjects.Image;
  private readonly container: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private cardObjects: Phaser.GameObjects.GameObject[] = [];
  private selecting = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly services: GameServices,
  ) {
    this.scrim = scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.modalScrim)
      .setDepth(1100)
      .setAlpha(0)
      .setVisible(false)
      .setInteractive();
    this.container = scene.add.container(0, 0).setDepth(1101).setVisible(false).setAlpha(0);
    this.title = scene.add
      .text(GAME_WIDTH / 2, 180, "", {
        color: "#fff1bd",
        fontFamily: "Georgia, serif",
        fontSize: "28px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container.add(this.title);
  }

  show(candidateIds: readonly string[], usedExtraChoice: boolean): void {
    this.clearCards();
    this.selecting = false;
    this.title.setText(usedExtraChoice ? "选择本关祝福（4 选 1）" : "选择本关祝福");

    const count = candidateIds.length;
    const totalWidth = count * CARD_WIDTH + (count - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2 + CARD_WIDTH / 2;
    candidateIds.forEach((id, index) => {
      const config = CONFIG_BY_ID.get(id);
      if (config === undefined) {
        return;
      }
      this.buildCard(config, startX + index * (CARD_WIDTH + CARD_GAP));
    });

    this.scrim.setVisible(true);
    this.container.setVisible(true).setAlpha(0).setY(20);
    this.scene.tweens.add({ targets: this.scrim, alpha: 0.68, duration: 200, ease: "Quad.Out" });
    this.scene.tweens.add({ targets: this.container, alpha: 1, y: 0, duration: 220, ease: "Cubic.Out" });
  }

  hide(): void {
    this.scene.tweens.add({ targets: this.scrim, alpha: 0, duration: 160, ease: "Quad.In" });
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: 14,
      duration: 160,
      ease: "Cubic.In",
      onComplete: () => {
        this.container.setVisible(false);
        this.scrim.setVisible(false);
        this.clearCards();
      },
    });
  }

  destroy(): void {
    this.clearCards();
    this.scrim.destroy();
    this.container.destroy(true);
  }

  private buildCard(config: BlessingConfig, centerX: number): void {
    const card = this.scene.add
      .image(centerX, CARD_CENTER_Y, ASSET_KEYS.blessingCard)
      .setInteractive({ useHandCursor: true });
    const name = this.scene.add
      .text(centerX, CARD_CENTER_Y - 118, config.name, {
        color: "#fff1bd",
        fontFamily: BODY_FONT,
        fontSize: "20px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const description = this.scene.add
      .text(centerX, CARD_CENTER_Y + 50, config.description, {
        align: "center",
        color: "#d7e0e6",
        fontFamily: BODY_FONT,
        fontSize: "16px",
        wordWrap: { width: CARD_WIDTH - 40 },
      })
      .setOrigin(0.5, 0);
    const hint = this.scene.add
      .text(centerX, CARD_CENTER_Y + 118, "点击选择", {
        color: "#9fb0b8",
        fontFamily: BODY_FONT,
        fontSize: "14px",
      })
      .setOrigin(0.5);

    card.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (!this.selecting) {
        card.setScale(1.05);
      }
    });
    card.on(Phaser.Input.Events.POINTER_OUT, () => card.setScale(1));
    card.on(Phaser.Input.Events.POINTER_DOWN, () => this.select(config.id, card));

    this.container.add([card, name, description, hint]);
    this.cardObjects.push(card, name, description, hint);
  }

  private select(blessingId: string, card: Phaser.GameObjects.Image): void {
    if (this.selecting) {
      return;
    }
    this.selecting = true;
    this.scene.tweens.add({
      targets: card,
      scale: { from: 1.05, to: 1.12 },
      duration: 160,
      ease: "Quad.Out",
    });
    this.services.events.emit("intent:select-blessing", { blessingId });
  }

  private clearCards(): void {
    for (const object of this.cardObjects) {
      object.destroy();
    }
    this.cardObjects = [];
  }
}
