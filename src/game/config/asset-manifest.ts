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
  playerDrawArm: "character-player-draw-arm",
  bowBasic: "bow-basic",
  bowStringBasic: "bow-string-basic",
  arrowBasic: "arrow-basic",
  targetBasic: "target-basic",
  coinBasic: "coin-basic",
  coinSmall: "coin-small",
  coinLarge: "coin-large",
  coinBag: "coin-bag",
  coinGlowing: "coin-glowing",
  robotBasic: "robot-basic",
  petBasic: "pet-basic",
  chestBasic: "chest-basic",
  loadingTrack: "ui-loading-track",
  loadingFill: "ui-loading-fill",
  hudPanel: "ui-hud-panel",
  hudPillLeft: "ui-hud-pill-left",
  hudPillCenter: "ui-hud-pill-center",
  hudPillRight: "ui-hud-pill-right",
  modalScrim: "ui-modal-scrim",
  modalPanel: "ui-modal-panel",
  blessingCard: "ui-blessing-card",
  cooldownTrack: "ui-cooldown-track",
  cooldownFill: "ui-cooldown-fill",
  goalTrack: "ui-goal-track",
  goalFill: "ui-goal-fill",
  missDust: "effect-miss-dust",
  hitSpark: "effect-hit-spark",
} as const;

export const VISUAL_ASSETS: readonly VisualAssetDefinition[] = [
  asset(ASSET_KEYS.loadingTrack, "ui/loading-track.svg", 480, 28, "ui", "boot"),
  asset(ASSET_KEYS.loadingFill, "ui/loading-fill.svg", 464, 12, "ui", "boot"),
  asset(ASSET_KEYS.meadowBackground, "backgrounds/meadow-range.svg", 1280, 720, "backgrounds"),
  asset(ASSET_KEYS.playerBody, "characters/player-body.svg", 144, 220, "characters"),
  asset(ASSET_KEYS.playerDrawArm, "characters/player-draw-arm.svg", 64, 40, "characters"),
  asset(ASSET_KEYS.bowBasic, "bows/basic-bow.svg", 72, 148, "bows"),
  asset(ASSET_KEYS.bowStringBasic, "bows/basic-bow-string.svg", 72, 148, "bows"),
  asset(ASSET_KEYS.arrowBasic, "arrows/basic-arrow.svg", 160, 24, "arrows"),
  asset(ASSET_KEYS.targetBasic, "targets/basic-target.svg", 180, 220, "targets"),
  asset(ASSET_KEYS.coinBasic, "coins/basic-coin.svg", 64, 64, "coins"),
  asset(ASSET_KEYS.coinSmall, "coins/small-coin.svg", 64, 64, "coins"),
  asset(ASSET_KEYS.coinLarge, "coins/large-coin.svg", 64, 64, "coins"),
  asset(ASSET_KEYS.coinBag, "coins/coin-bag.svg", 64, 64, "coins"),
  asset(ASSET_KEYS.coinGlowing, "coins/glowing-coin.svg", 64, 64, "coins"),
  asset(ASSET_KEYS.robotBasic, "robots/basic-robot.svg", 120, 180, "robots"),
  asset(ASSET_KEYS.petBasic, "pets/basic-pet.svg", 100, 80, "pets"),
  asset(ASSET_KEYS.chestBasic, "chests/basic-chest.svg", 128, 112, "chests"),
  asset(ASSET_KEYS.hudPanel, "ui/hud-panel.svg", 1240, 72, "ui"),
  asset(ASSET_KEYS.hudPillLeft, "ui/hud-pill-left.svg", 360, 56, "ui"),
  asset(ASSET_KEYS.hudPillCenter, "ui/hud-pill-center.svg", 500, 56, "ui"),
  asset(ASSET_KEYS.hudPillRight, "ui/hud-pill-right.svg", 360, 56, "ui"),
  asset(ASSET_KEYS.modalScrim, "ui/modal-scrim.svg", 1280, 720, "ui"),
  asset(ASSET_KEYS.modalPanel, "ui/modal-panel.svg", 960, 620, "ui"),
  asset(ASSET_KEYS.blessingCard, "ui/blessing-card.svg", 220, 300, "ui"),
  asset(ASSET_KEYS.cooldownTrack, "ui/cooldown-track.svg", 200, 16, "ui"),
  asset(ASSET_KEYS.cooldownFill, "ui/cooldown-fill.svg", 192, 8, "ui"),
  asset(ASSET_KEYS.goalTrack, "ui/goal-track.svg", 260, 14, "ui"),
  asset(ASSET_KEYS.goalFill, "ui/goal-fill.svg", 252, 8, "ui"),
  asset(ASSET_KEYS.missDust, "effects/miss-dust.svg", 96, 48, "effects"),
  asset(ASSET_KEYS.hitSpark, "effects/hit-spark.svg", 96, 96, "effects"),
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
