export type VisualAssetCategory =
  | "backgrounds"
  | "characters"
  | "bows"
  | "arrows"
  | "targets"
  | "coins"
  | "robots"
  | "pets"
  | "chests"
  | "ui"
  | "effects";

export type VisualAssetDefinition = {
  readonly key: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly category: VisualAssetCategory;
  readonly loadPhase: "boot" | "preload";
};

export const ASSET_KEYS = {
  meadowBackground: "background-meadow",
  playerBody: "character-player-body",
  bowBasic: "bow-basic",
  arrowBasic: "arrow-basic",
  targetBasic: "target-basic",
  coinBasic: "coin-basic",
  robotBasic: "robot-basic",
  petBasic: "pet-basic",
  chestBasic: "chest-basic",
  loadingTrack: "ui-loading-track",
  loadingFill: "ui-loading-fill",
  hudPanel: "ui-hud-panel",
} as const;

export const VISUAL_ASSETS: readonly VisualAssetDefinition[] = [
  asset(ASSET_KEYS.loadingTrack, "ui/loading-track.svg", 480, 28, "ui", "boot"),
  asset(ASSET_KEYS.loadingFill, "ui/loading-fill.svg", 464, 12, "ui", "boot"),
  asset(ASSET_KEYS.meadowBackground, "backgrounds/meadow-range.svg", 1280, 720, "backgrounds"),
  asset(ASSET_KEYS.playerBody, "characters/player-body.svg", 144, 220, "characters"),
  asset(ASSET_KEYS.bowBasic, "bows/basic-bow.svg", 72, 148, "bows"),
  asset(ASSET_KEYS.arrowBasic, "arrows/basic-arrow.svg", 160, 24, "arrows"),
  asset(ASSET_KEYS.targetBasic, "targets/basic-target.svg", 180, 220, "targets"),
  asset(ASSET_KEYS.coinBasic, "coins/basic-coin.svg", 64, 64, "coins"),
  asset(ASSET_KEYS.robotBasic, "robots/basic-robot.svg", 120, 180, "robots"),
  asset(ASSET_KEYS.petBasic, "pets/basic-pet.svg", 100, 80, "pets"),
  asset(ASSET_KEYS.chestBasic, "chests/basic-chest.svg", 128, 112, "chests"),
  asset(ASSET_KEYS.hudPanel, "ui/hud-panel.svg", 1240, 72, "ui"),
] as const;

function asset(
  key: string,
  path: string,
  width: number,
  height: number,
  category: VisualAssetCategory,
  loadPhase: VisualAssetDefinition["loadPhase"] = "preload",
): VisualAssetDefinition {
  return {
    key,
    path: `/assets/svg/${path}`,
    width,
    height,
    category,
    loadPhase,
  };
}
