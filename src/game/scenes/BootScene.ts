import * as Phaser from "phaser";
import { createGameServices, GAME_SERVICES_REGISTRY_KEY } from "../GameServices";
import { VISUAL_ASSETS } from "../config/asset-manifest";
import { SCENE_KEYS } from "../config/game.constants";
import { LocalStorageSaveRepository } from "../save/LocalStorageSaveRepository";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  preload(): void {
    for (const asset of VISUAL_ASSETS) {
      if (asset.loadPhase === "boot") {
        this.load.svg(asset.key, asset.path, { width: asset.width, height: asset.height });
      }
    }
  }

  create(): void {
    const repository = new LocalStorageSaveRepository();
    const services = createGameServices(repository.load(), repository);
    this.registry.set(GAME_SERVICES_REGISTRY_KEY, services);
    // 页面进入隐藏状态时暂停整局模拟，恢复可见时解除该暂停原因。
    this.game.events.on(Phaser.Core.Events.HIDDEN, () => services.state.setVisibilityPaused(true));
    this.game.events.on(Phaser.Core.Events.VISIBLE, () => services.state.setVisibilityPaused(false));
    // 页面关闭前冲刷未保存的进度。
    globalThis.addEventListener("beforeunload", () => services.saveService.flush());
    this.scene.start(SCENE_KEYS.preload);
  }
}
