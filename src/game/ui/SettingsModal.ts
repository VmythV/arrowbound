import * as Phaser from "phaser";
import { ASSET_KEYS } from "../config/asset-manifest";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/game.constants";
import type { GameServices } from "../GameServices";

const PANEL_X = GAME_WIDTH / 2;
const PANEL_Y = 330;
const BODY_FONT = 'Inter, "Noto Sans SC", sans-serif';

/**
 * 设置弹窗。首版仅提供暂停容器与关闭；音量、音效与清除存档在阶段 11、12 补入。
 * 打开时通过 StateController 暂停主游戏，关闭后恢复。
 */
export class SettingsModal {
  private readonly scrim: Phaser.GameObjects.Image;
  private readonly container: Phaser.GameObjects.Container;
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
      .text(PANEL_X, PANEL_Y - 278, "设置", {
        color: "#fff1bd",
        fontFamily: "Georgia, serif",
        fontSize: "26px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const hint = scene.add
      .text(PANEL_X, PANEL_Y - 30, "游戏已暂停", {
        color: "#d7e0e6",
        fontFamily: BODY_FONT,
        fontSize: "20px",
      })
      .setOrigin(0.5);
    const closeButton = scene.add
      .text(1050, PANEL_Y - 278, "关闭", {
        color: "#f8f1dc",
        fontFamily: BODY_FONT,
        fontSize: "18px",
        fontStyle: "bold",
        backgroundColor: "#3a4d58",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.services.events.emit("intent:close-modal", {});
    });
    this.container.add([panel, title, hint, closeButton]);
  }

  get isOpen(): boolean {
    return this.visible;
  }

  open(): void {
    this.visible = true;
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

  destroy(): void {
    this.openTween?.stop();
    this.scrim.destroy();
    this.container.destroy(true);
  }
}
