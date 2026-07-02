import * as Phaser from "phaser";
import { ASSET_KEYS } from "../config/asset-manifest";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/game.constants";
import { SHOP_CONFIGS } from "../config/shop.config";
import type { PendingReward } from "../state/SaveData";
import type { GameServices } from "../GameServices";

const CENTER_X = GAME_WIDTH / 2;
const CHEST_Y = 320;
const BODY_FONT = 'Inter, "Noto Sans SC", sans-serif';

function shopItemName(itemId: string): string {
  return SHOP_CONFIGS.find((config) => config.id === itemId)?.name ?? itemId;
}

function rewardTitle(reward: PendingReward): string {
  return reward.source === "lucky_first_ten" ? "幸运首箭" : "挑战宝箱";
}

function rewardDescription(reward: PendingReward): string {
  switch (reward.type) {
    case "coins":
      return `获得 ${reward.amount ?? 0} 金币`;
    case "shop_level":
      return `免费升级：${shopItemName(reward.shopItemId ?? "")}`;
    case "extra_blessing_choice":
      return "获得 1 次额外祝福候选";
  }
}

/**
 * 宝箱与奖励弹窗。展示当前待领取奖励，点击领取发出意图，由 MainGameScene 发放并推进队列。
 */
export class RewardOverlay {
  private readonly scrim: Phaser.GameObjects.Image;
  private readonly container: Phaser.GameObjects.Container;
  private readonly chest: Phaser.GameObjects.Image;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly descriptionText: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly services: GameServices,
  ) {
    this.scrim = scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.modalScrim)
      .setDepth(1200)
      .setAlpha(0)
      .setVisible(false)
      .setInteractive();
    this.container = scene.add.container(0, 0).setDepth(1201).setVisible(false).setAlpha(0);
    this.titleText = scene.add
      .text(CENTER_X, 180, "", {
        color: "#fff1bd",
        fontFamily: "Georgia, serif",
        fontSize: "30px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.chest = scene.add.image(CENTER_X, CHEST_Y, ASSET_KEYS.chestBasic).setScale(1.4);
    this.descriptionText = scene.add
      .text(CENTER_X, 430, "", {
        color: "#ffe9a0",
        fontFamily: BODY_FONT,
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const claimButton = scene.add
      .text(CENTER_X, 500, "领取", {
        color: "#f8f1dc",
        fontFamily: BODY_FONT,
        fontSize: "22px",
        fontStyle: "bold",
        backgroundColor: "#2f6f45",
        padding: { x: 26, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    claimButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.services.events.emit("intent:claim-reward", {});
    });
    this.container.add([this.titleText, this.chest, this.descriptionText, claimButton]);
  }

  show(reward: PendingReward): void {
    this.titleText.setText(rewardTitle(reward));
    this.descriptionText.setText(rewardDescription(reward));

    this.scrim.setVisible(true);
    this.container.setVisible(true).setAlpha(0);
    this.chest.setScale(1.1);
    this.scene.tweens.add({ targets: this.scrim, alpha: 0.7, duration: 180, ease: "Quad.Out" });
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 180, ease: "Cubic.Out" });
    this.scene.tweens.add({
      targets: this.chest,
      scale: { from: 1.1, to: 1.4 },
      duration: 420,
      ease: "Back.Out",
    });
  }

  hide(): void {
    this.scene.tweens.add({ targets: this.scrim, alpha: 0, duration: 150, ease: "Quad.In" });
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      ease: "Cubic.In",
      onComplete: () => {
        this.container.setVisible(false);
        this.scrim.setVisible(false);
      },
    });
  }

  destroy(): void {
    this.scrim.destroy();
    this.container.destroy(true);
  }
}
