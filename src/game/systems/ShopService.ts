import { MINIMUM_SHOT_COOLDOWN_SECONDS, INITIAL_SHOT_COOLDOWN_SECONDS } from "../config/game.constants";
import {
  SHOP_CONFIGS,
  type ShopItemConfig,
  type ShopItemId,
  type ShopUnlockCondition,
} from "../config/shop.config";
import type { ShopSaveData } from "../state/SaveData";

/** 判定解锁树 `cleared_level` 条件所需的最小进度接口。 */
export type ShopUnlockContext = {
  isNormalCleared(levelId: number): boolean;
};

export type PurchaseStatus = "ok" | "locked" | "maxed" | "insufficient";

export type PurchaseResult = {
  readonly status: PurchaseStatus;
  readonly itemId: ShopItemId;
  readonly cost: number;
  readonly level: number;
  /** 本次购买后新解锁的商品（用于解锁动效）。 */
  readonly newlyUnlocked: readonly ShopItemId[];
};

const QUICK_DRAW_PER_LEVEL = 0.04;
const ROBOT_BASE_INTERVAL_SECONDS = 4;
const ROBOT_INTERVAL_DECAY = 0.95;
const ROBOT_BASE_MULTIPLIER = 0.7;
const ROBOT_GREED_PER_LEVEL = 0.08;
const GREEDY_COIN_PER_LEVEL = 0.1;

/**
 * 机器人数量公式（见 05 文档 §6），上限为 5。
 */
export function robotCountForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level >= 20) return 5;
  if (level >= 15) return 4;
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

/**
 * 快速拉弓后的射箭冷却，受 0.35 秒下限约束。
 */
export function shotCooldownForLevel(quickDrawLevel: number): number {
  return Math.max(
    MINIMUM_SHOT_COOLDOWN_SECONDS,
    INITIAL_SHOT_COOLDOWN_SECONDS - QUICK_DRAW_PER_LEVEL * quickDrawLevel,
  );
}

/**
 * 永久商店的内存态：各商品等级、价格、解锁树与效果读数。
 * 购买只经 `tryPurchase`，扣费通过注入的 spend 回调，保持与 CoinLedger 解耦。
 */
export class ShopService {
  private readonly levels: Record<ShopItemId, number>;
  private readonly configs = new Map<ShopItemId, ShopItemConfig>();

  constructor(shop: ShopSaveData = ShopService.defaultLevels()) {
    for (const config of SHOP_CONFIGS) {
      this.configs.set(config.id, config);
    }
    this.levels = {
      precise_aim: clampLevel(shop.preciseAimLevel, this.maxLevel("precise_aim")),
      greedy_coin: clampLevel(shop.greedyCoinLevel, this.maxLevel("greedy_coin")),
      quick_draw: clampLevel(shop.quickDrawLevel, this.maxLevel("quick_draw")),
      robot_archer: clampLevel(shop.robotArcherLevel, this.maxLevel("robot_archer")),
      robot_rapid_fire: clampLevel(shop.robotRapidFireLevel, this.maxLevel("robot_rapid_fire")),
      robot_greed: clampLevel(shop.robotGreedLevel, this.maxLevel("robot_greed")),
      coin_pet: clampLevel(shop.coinPetLevel, this.maxLevel("coin_pet")),
    };
  }

  get items(): readonly ShopItemConfig[] {
    return SHOP_CONFIGS;
  }

  getLevel(itemId: ShopItemId): number {
    return this.levels[itemId];
  }

  maxLevel(itemId: ShopItemId): number {
    return this.configFor(itemId).maxLevel;
  }

  isMaxed(itemId: ShopItemId): boolean {
    return this.levels[itemId] >= this.maxLevel(itemId);
  }

  /**
   * 下一级价格：`ceil(baseCost × costMultiplier ^ currentLevel)`；已满级返回 undefined。
   */
  getCost(itemId: ShopItemId): number | undefined {
    if (this.isMaxed(itemId)) {
      return undefined;
    }
    const config = this.configFor(itemId);
    return Math.ceil(config.baseCost * config.costMultiplier ** this.levels[itemId]);
  }

  isUnlocked(itemId: ShopItemId, context: ShopUnlockContext): boolean {
    return this.evaluateCondition(this.configFor(itemId).unlockCondition, context);
  }

  /**
   * 免费升级奖励的候选：已解锁且未满级的商品。
   */
  freeUpgradableItems(context: ShopUnlockContext): ShopItemId[] {
    return SHOP_CONFIGS.filter(
      (config) => this.isUnlocked(config.id, context) && !this.isMaxed(config.id),
    ).map((config) => config.id);
  }

  /**
   * 免费提升一级（挑战宝箱免费升级奖励）；已满级则不改动，返回新解锁的商品。
   */
  grantLevel(itemId: ShopItemId, context: ShopUnlockContext): readonly ShopItemId[] {
    if (this.isMaxed(itemId)) {
      return [];
    }
    const unlockedBefore = this.unlockedSet(context);
    this.levels[itemId] += 1;
    return [...this.unlockedSet(context)].filter((id) => !unlockedBefore.has(id));
  }

  tryPurchase(
    itemId: ShopItemId,
    context: ShopUnlockContext,
    spend: (cost: number) => boolean,
  ): PurchaseResult {
    if (!this.isUnlocked(itemId, context)) {
      return this.result("locked", itemId, this.levels[itemId]);
    }
    if (this.isMaxed(itemId)) {
      return this.result("maxed", itemId, this.levels[itemId]);
    }
    const cost = this.getCost(itemId) ?? 0;
    const unlockedBefore = this.unlockedSet(context);
    if (!spend(cost)) {
      return this.result("insufficient", itemId, this.levels[itemId], cost);
    }
    this.levels[itemId] += 1;
    const newlyUnlocked = [...this.unlockedSet(context)].filter((id) => !unlockedBefore.has(id));
    return {
      status: "ok",
      itemId,
      cost,
      level: this.levels[itemId],
      newlyUnlocked,
    };
  }

  // --- 效果读数 ---

  get preciseAimLevel(): number {
    return this.levels.precise_aim;
  }

  get greedyCoinLevel(): number {
    return this.levels.greedy_coin;
  }

  get robotGreedLevel(): number {
    return this.levels.robot_greed;
  }

  get coinPetLevel(): number {
    return this.levels.coin_pet;
  }

  shotCooldownSeconds(): number {
    return shotCooldownForLevel(this.levels.quick_draw);
  }

  robotCount(): number {
    return robotCountForLevel(this.levels.robot_archer);
  }

  robotShotIntervalSeconds(): number {
    return ROBOT_BASE_INTERVAL_SECONDS * ROBOT_INTERVAL_DECAY ** this.levels.robot_rapid_fire;
  }

  robotCoinMultiplier(): number {
    return ROBOT_BASE_MULTIPLIER * (1 + ROBOT_GREED_PER_LEVEL * this.levels.robot_greed);
  }

  /**
   * 描述某商品到达 `level` 级时的效果，用于展示“下一等级效果”。
   */
  describeEffectAtLevel(itemId: ShopItemId, level: number): string {
    switch (itemId) {
      case "precise_aim":
        return `十环基础半径 +${level}%`;
      case "greedy_coin":
        return `手动金币 ×${(1 + GREEDY_COIN_PER_LEVEL * level).toFixed(2)}`;
      case "quick_draw":
        return `射箭冷却 ${shotCooldownForLevel(level).toFixed(2)} 秒`;
      case "robot_archer":
        return `机器人 ${robotCountForLevel(level)} 个`;
      case "robot_rapid_fire":
        return `机器人间隔 ${(ROBOT_BASE_INTERVAL_SECONDS * ROBOT_INTERVAL_DECAY ** level).toFixed(2)} 秒`;
      case "robot_greed":
        return `机器人金币 ×${(ROBOT_BASE_MULTIPLIER * (1 + ROBOT_GREED_PER_LEVEL * level)).toFixed(2)}`;
      case "coin_pet":
        return `金币宠物强化 Lv.${level}`;
    }
  }

  private unlockedSet(context: ShopUnlockContext): Set<ShopItemId> {
    const unlocked = new Set<ShopItemId>();
    for (const config of SHOP_CONFIGS) {
      if (this.isUnlocked(config.id, context)) {
        unlocked.add(config.id);
      }
    }
    return unlocked;
  }

  private evaluateCondition(condition: ShopUnlockCondition, context: ShopUnlockContext): boolean {
    switch (condition.type) {
      case "always":
        return true;
      case "item_level":
        return this.levels[condition.itemId] >= condition.level;
      case "cleared_level":
        return context.isNormalCleared(condition.levelId);
      case "any":
        return condition.conditions.some((inner) => this.evaluateCondition(inner, context));
    }
  }

  private configFor(itemId: ShopItemId): ShopItemConfig {
    const config = this.configs.get(itemId);
    if (config === undefined) {
      throw new Error(`Unknown shop item ${itemId}`);
    }
    return config;
  }

  private result(
    status: PurchaseStatus,
    itemId: ShopItemId,
    level: number,
    cost = 0,
  ): PurchaseResult {
    return { status, itemId, cost, level, newlyUnlocked: [] };
  }

  private static defaultLevels(): ShopSaveData {
    return {
      preciseAimLevel: 0,
      greedyCoinLevel: 0,
      quickDrawLevel: 0,
      robotArcherLevel: 0,
      robotRapidFireLevel: 0,
      robotGreedLevel: 0,
      coinPetLevel: 0,
    };
  }
}

function clampLevel(level: number, maxLevel: number): number {
  if (!Number.isFinite(level) || level < 0) {
    return 0;
  }
  return Math.min(Math.floor(level), maxLevel);
}
