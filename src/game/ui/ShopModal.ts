import * as Phaser from "phaser";
import { ASSET_KEYS } from "../config/asset-manifest";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/game.constants";
import { SHOP_CONFIGS, type ShopItemConfig, type ShopItemId, type ShopUnlockCondition } from "../config/shop.config";
import type { GameServices } from "../GameServices";
import { THEME } from "../config/theme";

const PANEL_X = GAME_WIDTH / 2;
const PANEL_Y = 330;
const ROW_START_Y = 150;
const ROW_STEP = 66;
const NAME_X = 210;
const LEVEL_X = 628;
const COST_X = 812;
const BUTTON_X = 1004;

const BODY_FONT = THEME.fonts.body;
const TITLE_FONT = THEME.fonts.display;

type ShopRow = {
  readonly config: ShopItemConfig;
  readonly name: Phaser.GameObjects.Text;
  readonly effect: Phaser.GameObjects.Text;
  readonly level: Phaser.GameObjects.Text;
  readonly cost: Phaser.GameObjects.Text;
  readonly button: Phaser.GameObjects.Text;
};

/**
 * 永久商店弹窗。展示每项升级的等级、下一等级效果、价格与解锁/满级/金币不足状态，
 * 购买按钮只发出意图事件，实际购买由 MainGameScene 统一处理。
 */
export class ShopModal {
  private readonly scrim: Phaser.GameObjects.Image;
  private readonly container: Phaser.GameObjects.Container;
  private readonly coinsText: Phaser.GameObjects.Text;
  private readonly rows: ShopRow[] = [];
  private openTween: Phaser.Tweens.Tween | undefined;
  private visible = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly services: GameServices,
  ) {
    this.scrim = scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.modalScrim)
      .setDepth(1000)
      .setAlpha(0)
      .setVisible(false)
      .setInteractive();

    this.container = scene.add.container(0, 0).setDepth(1001).setVisible(false).setAlpha(0);
    const panel = scene.add.image(PANEL_X, PANEL_Y, ASSET_KEYS.modalPanel);
    const title = scene.add
      .text(PANEL_X, PANEL_Y - 278, "永久商店", {
        color: THEME.color.title,
        fontFamily: TITLE_FONT,
        fontSize: "26px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.coinsText = scene.add
      .text(230, PANEL_Y - 278, "", {
        color: THEME.color.coin,
        fontFamily: BODY_FONT,
        fontSize: "20px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    const closeButton = scene.add
      .text(1050, PANEL_Y - 278, "关闭", {
        color: THEME.color.title,
        fontFamily: BODY_FONT,
        fontSize: "18px",
        fontStyle: "bold",
        backgroundColor: THEME.color.panelAlt,
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.services.events.emit("intent:close-modal", {});
    });
    this.container.add([panel, title, this.coinsText, closeButton]);

    SHOP_CONFIGS.forEach((config, index) => this.rows.push(this.buildRow(config, index)));
  }

  get isOpen(): boolean {
    return this.visible;
  }

  open(): void {
    this.visible = true;
    this.refresh();
    this.openTween?.stop();
    this.scrim.setVisible(true);
    this.container.setVisible(true).setAlpha(0).setY(18);
    this.scene.tweens.add({ targets: this.scrim, alpha: 0.62, duration: 180, ease: "Quad.Out" });
    this.openTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: 0,
      duration: 180,
      ease: "Cubic.Out",
    });
  }

  close(): void {
    if (!this.visible) {
      return;
    }
    this.visible = false;
    this.openTween?.stop();
    this.scene.tweens.add({ targets: this.scrim, alpha: 0, duration: 140, ease: "Quad.In" });
    this.openTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: 14,
      duration: 140,
      ease: "Cubic.In",
      onComplete: () => {
        this.container.setVisible(false);
        this.scrim.setVisible(false);
      },
    });
  }

  refresh(): void {
    const services = this.services;
    this.coinsText.setText(`金币 ${services.ledger.coins}`);
    const context = {
      isNormalCleared: (levelId: number) => services.progression.isNormalCleared(levelId),
    };
    for (const row of this.rows) {
      this.refreshRow(row, context);
    }
  }

  flashPurchase(itemId: ShopItemId): void {
    const row = this.rows.find((candidate) => candidate.config.id === itemId);
    if (row === undefined) {
      return;
    }
    row.name.setColor(THEME.color.ok);
    this.scene.tweens.add({
      targets: [row.name, row.level],
      scale: { from: 1.12, to: 1 },
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => row.name.setColor(THEME.color.title),
    });
  }

  flashFailure(itemId: ShopItemId): void {
    const row = this.rows.find((candidate) => candidate.config.id === itemId);
    if (row === undefined) {
      return;
    }
    this.scene.tweens.add({
      targets: row.cost,
      x: { from: COST_X - 4, to: COST_X },
      duration: 160,
      ease: "Sine.InOut",
    });
  }

  destroy(): void {
    this.openTween?.stop();
    this.scrim.destroy();
    this.container.destroy(true);
    this.rows.length = 0;
  }

  private buildRow(config: ShopItemConfig, index: number): ShopRow {
    const y = ROW_START_Y + index * ROW_STEP;
    const name = this.scene.add
      .text(NAME_X, y - 11, config.name, {
        color: THEME.color.title,
        fontFamily: BODY_FONT,
        fontSize: "20px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    const effect = this.scene.add
      .text(NAME_X, y + 13, "", {
        color: THEME.color.muted,
        fontFamily: BODY_FONT,
        fontSize: "15px",
      })
      .setOrigin(0, 0.5);
    const level = this.scene.add
      .text(LEVEL_X, y, "", {
        color: THEME.color.body,
        fontFamily: BODY_FONT,
        fontSize: "17px",
      })
      .setOrigin(0.5);
    const cost = this.scene.add
      .text(COST_X, y, "", {
        color: THEME.color.coin,
        fontFamily: BODY_FONT,
        fontSize: "17px",
      })
      .setOrigin(0.5);
    const button = this.scene.add
      .text(BUTTON_X, y, "购买", {
        color: THEME.color.title,
        fontFamily: BODY_FONT,
        fontSize: "18px",
        fontStyle: "bold",
        backgroundColor: THEME.color.ok,
        padding: { x: 16, y: 7 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (button.input?.enabled === true) {
        this.services.events.emit("intent:purchase-shop-item", { itemId: config.id });
      }
    });
    this.container.add([name, effect, level, cost, button]);
    return { config, name, effect, level, cost, button };
  }

  private refreshRow(row: ShopRow, context: { isNormalCleared: (levelId: number) => boolean }): void {
    const shop = this.services.shop;
    const id = row.config.id;
    const level = shop.getLevel(id);
    const maxLevel = shop.maxLevel(id);
    row.level.setText(`Lv.${level} / ${maxLevel}`);
    row.name.setAlpha(1);

    if (!shop.isUnlocked(id, context)) {
      row.name.setAlpha(0.5);
      row.effect.setText(`未解锁：${this.describeUnlock(row.config.unlockCondition)}`).setColor(THEME.color.muted);
      row.cost.setText("");
      this.setButton(row.button, "锁定", false);
      return;
    }
    if (shop.isMaxed(id)) {
      row.effect.setText(`已满级：${shop.describeEffectAtLevel(id, level)}`).setColor(THEME.color.muted);
      row.level.setText(`Lv.${maxLevel}（满级）`);
      row.cost.setText("");
      this.setButton(row.button, "满级", false);
      return;
    }
    const cost = shop.getCost(id) ?? 0;
    const affordable = this.services.ledger.coins >= cost;
    row.effect.setText(`下一级：${shop.describeEffectAtLevel(id, level + 1)}`).setColor(THEME.color.muted);
    row.cost.setText(`价格 ${cost}`).setColor(affordable ? THEME.color.coin : THEME.color.danger);
    this.setButton(row.button, "购买", affordable);
  }

  private setButton(button: Phaser.GameObjects.Text, label: string, enabled: boolean): void {
    button.setText(label);
    button.setAlpha(enabled ? 1 : 0.5);
    button.setBackgroundColor(enabled ? THEME.color.ok : THEME.color.panelAlt);
    if (enabled) {
      button.setInteractive({ useHandCursor: true });
    } else {
      button.disableInteractive();
    }
  }

  private describeUnlock(condition: ShopUnlockCondition): string {
    switch (condition.type) {
      case "always":
        return "";
      case "item_level":
        return `${this.itemName(condition.itemId)} Lv.${condition.level}`;
      case "cleared_level":
        return `通关第 ${condition.levelId} 关`;
      case "any":
        return condition.conditions.map((inner) => this.describeUnlock(inner)).join(" 或 ");
    }
  }

  private itemName(itemId: ShopItemId): string {
    return SHOP_CONFIGS.find((config) => config.id === itemId)?.name ?? itemId;
  }
}
