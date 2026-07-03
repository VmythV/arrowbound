import { INITIAL_PLAYER_COINS } from "../config/game.constants";
import type { ShopItemId } from "../config/shop.config";

export const CURRENT_SAVE_VERSION = 2;

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
  /** 局外永久成长（转生）：累计星尘与转生次数，转生时保留、其余进度重置。 */
  prestige: {
    stardust: number;
    count: number;
  };
};

export function createDefaultSaveData(): SaveData {
  // 关卡近似无限：默认只种下第 1 关，其余关卡在到达时由进度服务惰性创建。
  const levels: Record<number, LevelSaveData> = {
    1: {
      unlocked: true,
      normalCleared: false,
      challengeCompleted: false,
      challengeChestClaimed: false,
      luckyFirstTenRewardClaimed: false,
    },
  };

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
    prestige: {
      stardust: 0,
      count: 0,
    },
  };
}
