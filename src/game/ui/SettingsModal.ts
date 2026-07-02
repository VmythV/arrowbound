import * as Phaser from "phaser";
import { ASSET_KEYS } from "../config/asset-manifest";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/game.constants";
import type { GameServices } from "../GameServices";
import { THEME } from "../config/theme";

const PANEL_X = GAME_WIDTH / 2;
const PANEL_Y = 330;
const BODY_FONT = THEME.fonts.body;
const TITLE_FONT = THEME.fonts.display;
const VOLUME_STEP = 0.1;

type VolumeChannel = "master" | "music" | "sfx";

type VolumeRow = {
  readonly channel: VolumeChannel;
  readonly value: Phaser.GameObjects.Text;
};

/**
 * 设置弹窗：总音量、音乐、音效的加减调节与静音开关，以及清除存档并重新开始。
 * 打开时通过 StateController 暂停主游戏；控件只发意图，由 MainGameScene 应用并保存。
 */
export class SettingsModal {
  private readonly scrim: Phaser.GameObjects.Image;
  private readonly container: Phaser.GameObjects.Container;
  private readonly rows: VolumeRow[] = [];
  private readonly muteButton: Phaser.GameObjects.Text;
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
        color: THEME.color.title,
        fontFamily: TITLE_FONT,
        fontSize: "26px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const closeButton = this.textButton(1050, PANEL_Y - 278, "关闭", THEME.color.panelAlt, () => {
      this.services.events.emit("intent:close-modal", {});
    });
    this.container.add([panel, title, closeButton]);

    this.rows.push(this.buildVolumeRow("master", "总音量", 170));
    this.rows.push(this.buildVolumeRow("music", "音乐", 236));
    this.rows.push(this.buildVolumeRow("sfx", "音效", 302));

    this.muteButton = this.textButton(PANEL_X, 380, "", THEME.color.panelAlt, () => {
      this.services.events.emit("intent:toggle-mute", {});
    });
    const resetButton = this.textButton(PANEL_X, 470, "清除存档并重新开始", THEME.color.danger, () => {
      this.services.events.emit("intent:reset-save", {});
    });
    this.container.add([this.muteButton, resetButton]);
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
    const settings = this.services.settings;
    for (const row of this.rows) {
      row.value.setText(`${Math.round(this.channelValue(row.channel) * 100)}%`);
    }
    this.muteButton.setText(settings.muted ? "静音：开" : "静音：关");
  }

  destroy(): void {
    this.openTween?.stop();
    this.scrim.destroy();
    this.container.destroy(true);
    this.rows.length = 0;
  }

  private channelValue(channel: VolumeChannel): number {
    const settings = this.services.settings;
    if (channel === "master") return settings.master;
    if (channel === "music") return settings.music;
    return settings.sfx;
  }

  private buildVolumeRow(channel: VolumeChannel, label: string, y: number): VolumeRow {
    const labelText = this.scene.add
      .text(240, y, label, {
        color: THEME.color.body,
        fontFamily: BODY_FONT,
        fontSize: "20px",
      })
      .setOrigin(0, 0.5);
    const minus = this.textButton(560, y, "-", THEME.color.panelAlt, () => {
      this.services.events.emit("intent:adjust-volume", { channel, delta: -VOLUME_STEP });
    });
    const value = this.scene.add
      .text(660, y, "", {
        color: THEME.color.coin,
        fontFamily: BODY_FONT,
        fontSize: "20px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const plus = this.textButton(760, y, "+", THEME.color.panelAlt, () => {
      this.services.events.emit("intent:adjust-volume", { channel, delta: VOLUME_STEP });
    });
    this.container.add([labelText, minus, value, plus]);
    return { channel, value };
  }

  private textButton(
    x: number,
    y: number,
    label: string,
    background: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.scene.add
      .text(x, y, label, {
        color: THEME.color.title,
        fontFamily: BODY_FONT,
        fontSize: "20px",
        fontStyle: "bold",
        backgroundColor: background,
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.POINTER_DOWN, onClick);
    return button;
  }
}
