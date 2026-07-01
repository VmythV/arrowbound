export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GROUND_Y = 620;
export const PLAYER_POSITION = { x: 150, y: GROUND_Y } as const;
export const ARROW_SPAWN_POSITION = { x: 220, y: 470 } as const;
/** 金币 HUD 图标的逻辑坐标，金币拾取后飞向该点。 */
export const COIN_HUD_ANCHOR = { x: 300, y: 40 } as const;
export const INITIAL_PLAYER_COINS = 0;
export const INITIAL_SHOT_COOLDOWN_SECONDS = 1.2;
export const MINIMUM_SHOT_COOLDOWN_SECONDS = 0.35;
export const MAX_ROBOTS = 5;
export const MAX_COIN_PETS = 1;
export const CENTER_RING_RATIO_CAP = 0.3;
export const CHALLENGE_DURATION_SECONDS = 60;

export const SCENE_KEYS = {
  boot: "BootScene",
  preload: "PreloadScene",
  mainGame: "MainGameScene",
  ui: "UIScene",
} as const;
