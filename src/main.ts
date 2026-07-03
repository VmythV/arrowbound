import { createGame } from "./game/GameApp";
import "./styles/main.css";

/**
 * 先加载展示字体（Baloo 2）再启动游戏，避免 Phaser 首次栅格化文本时命中回退字体。
 * 字体加载失败（如离线）时静默回退到系统圆体，不阻塞启动。
 */
async function boot(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('700 24px "Baloo 2"'),
      document.fonts.load('800 24px "Baloo 2"'),
    ]);
  } catch {
    // 忽略：回退字体已在字体栈中。
  }
  createGame("app");
}

void boot();
