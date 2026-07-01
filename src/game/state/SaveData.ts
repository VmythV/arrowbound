import { INITIAL_PLAYER_COINS } from "../config/game.constants";
import { LEVEL_CONFIGS } from "../config/level.config";
import type { ShopItemId } from "../config/shop.config";

export const CURRENT_SAVE_VERSION = 1;

export type PendingRewardSource = "challenge" | "lucky_first_ten";
export type PendingRewardType = "coins" | "shop_level" | "extra_blessing_choice";

export type PendingReward = {
  readonly id: string;
  readonly source: PendingRewardSource;
  readonly levelId: number;
  readonly type: PendingRewardType;
  readonly amount?: number;
  readonly shopItemId?: ShopItemId;
};

export type LevelSaveData = {
  unlocked: boolean;
  selectedBlessingId?: string;
  normalCleared: boolean;
  challengeCompleted: boolean;
  challengeChestClaimed: boolean;
  luckyFirstTenRewardClaimed: boolean;
};

export type ShopSaveData = {
  preciseAimLevel: number;
  greedyCoinLevel: number;
  quickDrawLevel: number;
  robotArcherLevel: number;
  robotRapidFireLevel: number;
  robotGreedLevel: number;
  coinPetLevel: number;
};

export type SettingsSaveData = {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
};

export type SaveData = {
  version: number;
  player: {
    coins: number;
    currentLevel: number;
    maxUnlockedLevel: number;
  };
  shop: ShopSaveData;
  levels: Record<number, LevelSaveData>;
  rewards: {
    pendingExtraBlessingChoices: number;
    pendingRewards: PendingReward[];
  };
  settings: SettingsSaveData;
  stats: {
    totalShots: number;
    totalHits: number;
    totalCoinsEarned: number;
    totalTenRingHits: number;
  };
};

export function createDefaultSaveData(): SaveData {
  const levels = Object.fromEntries(
    LEVEL_CONFIGS.map((level) => [
      level.id,
      {
        unlocked: level.id === 1,
        normalCleared: false,
        challengeCompleted: false,
        challengeChestClaimed: false,
        luckyFirstTenRewardClaimed: false,
      } satisfies LevelSaveData,
    ]),
  ) as Record<number, LevelSaveData>;

  return {
    version: CURRENT_SAVE_VERSION,
    player: {
      coins: INITIAL_PLAYER_COINS,
      currentLevel: 1,
      maxUnlockedLevel: 1,
    },
    shop: {
      preciseAimLevel: 0,
      greedyCoinLevel: 0,
      quickDrawLevel: 0,
      robotArcherLevel: 0,
      robotRapidFireLevel: 0,
      robotGreedLevel: 0,
      coinPetLevel: 0,
    },
    levels,
    rewards: {
      pendingExtraBlessingChoices: 0,
      pendingRewards: [],
    },
    settings: {
      masterVolume: 0.8,
      musicVolume: 0.6,
      sfxVolume: 0.8,
      muted: false,
    },
    stats: {
      totalShots: 0,
      totalHits: 0,
      totalCoinsEarned: 0,
      totalTenRingHits: 0,
    },
  };
}
