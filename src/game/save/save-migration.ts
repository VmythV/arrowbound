import {
  CURRENT_SAVE_VERSION,
  createDefaultSaveData,
  type PendingReward,
  type PendingRewardSource,
  type PendingRewardType,
  type SaveData,
} from "../state/SaveData";
import type { ShopItemId } from "../config/shop.config";

const SHOP_KEYS: readonly (keyof SaveData["shop"])[] = [
  "preciseAimLevel",
  "greedyCoinLevel",
  "quickDrawLevel",
  "robotArcherLevel",
  "robotRapidFireLevel",
  "robotGreedLevel",
  "coinPetLevel",
];

const REWARD_SOURCES: readonly PendingRewardSource[] = ["challenge", "lucky_first_ten"];
const REWARD_TYPES: readonly PendingRewardType[] = ["coins", "shop_level", "extra_blessing_choice"];
const SHOP_ITEM_IDS: readonly ShopItemId[] = [
  "precise_aim",
  "greedy_coin",
  "quick_draw",
  "robot_archer",
  "robot_rapid_fire",
  "robot_greed",
  "coin_pet",
];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function toNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

function toInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.floor(value);
}

function toVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function cleanReward(raw: unknown): PendingReward | undefined {
  const record = asRecord(raw);
  if (record === undefined) {
    return undefined;
  }
  const id = record["id"];
  const source = record["source"];
  const levelId = record["levelId"];
  const type = record["type"];
  const amount = record["amount"];
  const shopItemId = record["shopItemId"];
  if (typeof id !== "string" || typeof levelId !== "number" || !Number.isFinite(levelId)) {
    return undefined;
  }
  if (!REWARD_SOURCES.includes(source as PendingRewardSource)) {
    return undefined;
  }
  if (!REWARD_TYPES.includes(type as PendingRewardType)) {
    return undefined;
  }
  const reward: PendingReward = {
    id,
    source: source as PendingRewardSource,
    levelId: Math.floor(levelId),
    type: type as PendingRewardType,
  };
  if (typeof amount === "number" && Number.isFinite(amount)) {
    return { ...reward, amount: Math.max(0, Math.floor(amount)) };
  }
  if (typeof shopItemId === "string" && SHOP_ITEM_IDS.includes(shopItemId as ShopItemId)) {
    return { ...reward, shopItemId: shopItemId as ShopItemId };
  }
  return reward;
}

/**
 * 将任意（可能损坏或缺字段、旧版本）的存档对象规整为当前版本的合法 SaveData：
 * 缺失字段补默认值、非法数值修正、未知字段忽略。版本差异的迁移入口也在此处。
 */
export function migrateAndNormalize(raw: unknown): SaveData {
  const base = createDefaultSaveData();
  const record = asRecord(raw);
  if (record === undefined) {
    return base;
  }

  const player = asRecord(record["player"]);
  if (player !== undefined) {
    base.player.coins = toNonNegativeInt(player["coins"], 0);
    base.player.currentLevel = toInt(player["currentLevel"], 1);
    base.player.maxUnlockedLevel = Math.max(1, toNonNegativeInt(player["maxUnlockedLevel"], 1));
  }

  const shop = asRecord(record["shop"]);
  if (shop !== undefined) {
    for (const key of SHOP_KEYS) {
      base.shop[key] = toNonNegativeInt(shop[key], 0);
    }
  }

  const levels = asRecord(record["levels"]);
  if (levels !== undefined) {
    for (const [id, rawEntry] of Object.entries(levels)) {
      const levelId = Number(id);
      const entry = asRecord(rawEntry);
      if (!Number.isInteger(levelId) || base.levels[levelId] === undefined || entry === undefined) {
        continue;
      }
      const selectedBlessingId = entry["selectedBlessingId"];
      base.levels[levelId] = {
        unlocked: entry["unlocked"] === true,
        normalCleared: entry["normalCleared"] === true,
        challengeCompleted: entry["challengeCompleted"] === true,
        challengeChestClaimed: entry["challengeChestClaimed"] === true,
        luckyFirstTenRewardClaimed: entry["luckyFirstTenRewardClaimed"] === true,
        ...(typeof selectedBlessingId === "string" ? { selectedBlessingId } : {}),
      };
    }
  }

  const rewards = asRecord(record["rewards"]);
  if (rewards !== undefined) {
    base.rewards.pendingExtraBlessingChoices = toNonNegativeInt(
      rewards["pendingExtraBlessingChoices"],
      0,
    );
    const pending = rewards["pendingRewards"];
    if (Array.isArray(pending)) {
      base.rewards.pendingRewards = pending
        .map(cleanReward)
        .filter((reward): reward is PendingReward => reward !== undefined);
    }
  }

  const settings = asRecord(record["settings"]);
  if (settings !== undefined) {
    base.settings = {
      masterVolume: toVolume(settings["masterVolume"], base.settings.masterVolume),
      musicVolume: toVolume(settings["musicVolume"], base.settings.musicVolume),
      sfxVolume: toVolume(settings["sfxVolume"], base.settings.sfxVolume),
      muted: settings["muted"] === true,
    };
  }

  const stats = asRecord(record["stats"]);
  if (stats !== undefined) {
    base.stats = {
      totalShots: toNonNegativeInt(stats["totalShots"], 0),
      totalHits: toNonNegativeInt(stats["totalHits"], 0),
      totalCoinsEarned: toNonNegativeInt(stats["totalCoinsEarned"], 0),
      totalTenRingHits: toNonNegativeInt(stats["totalTenRingHits"], 0),
    };
  }

  base.version = CURRENT_SAVE_VERSION;
  return base;
}
