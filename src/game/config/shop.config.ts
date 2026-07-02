export type ShopItemId =
  | "precise_aim"
  | "greedy_coin"
  | "quick_draw"
  | "robot_archer"
  | "robot_rapid_fire"
  | "robot_greed"
  | "coin_pet";

export type ShopUnlockCondition =
  | { readonly type: "always" }
  | { readonly type: "item_level"; readonly itemId: ShopItemId; readonly level: number }
  | { readonly type: "any"; readonly conditions: readonly ShopUnlockCondition[] }
  | { readonly type: "cleared_level"; readonly levelId: number };

/**
 * 无限流解封道具的工程封顶等级：足够高以近似“无上限”，同时避免病态无界。
 * 与关卡上限保持一致语义（见 docs/05 §6）。
 */
export const MAX_SHOP_LEVEL = 9999;

export type ShopItemConfig = {
  readonly id: ShopItemId;
  readonly name: string;
  readonly description: string;
  readonly baseCost: number;
  readonly costMultiplier: number;
  readonly maxLevel: number;
  readonly unlockCondition: ShopUnlockCondition;
};

export const SHOP_CONFIGS: readonly ShopItemConfig[] = [
  {
    id: "precise_aim",
    name: "精准瞄准",
    description: "每级为十环基础半径增加一个百分点",
    baseCost: 30,
    costMultiplier: 1.22,
    maxLevel: 20,
    unlockCondition: { type: "always" },
  },
  {
    id: "greedy_coin",
    name: "贪婪金币",
    description: "每级使手动金币倍率增加百分之十",
    baseCost: 40,
    costMultiplier: 1.25,
    // 无限流纯乘法收益道具，解封至工程上限（见 docs/05 §6）。
    maxLevel: MAX_SHOP_LEVEL,
    unlockCondition: { type: "always" },
  },
  {
    id: "quick_draw",
    name: "快速拉弓",
    description: "每级减少零点零四秒射箭冷却",
    baseCost: 80,
    costMultiplier: 1.28,
    maxLevel: 22,
    unlockCondition: { type: "item_level", itemId: "precise_aim", level: 3 },
  },
  {
    id: "robot_archer",
    name: "机械弓手",
    description: "按等级增加自动射箭机器人",
    baseCost: 150,
    costMultiplier: 1.45,
    maxLevel: 20,
    unlockCondition: { type: "item_level", itemId: "greedy_coin", level: 5 },
  },
  {
    id: "robot_rapid_fire",
    name: "机械连射",
    description: "缩短机器人射击间隔",
    baseCost: 120,
    costMultiplier: 1.3,
    maxLevel: 20,
    unlockCondition: { type: "item_level", itemId: "robot_archer", level: 3 },
  },
  {
    id: "robot_greed",
    name: "机械贪婪",
    description: "提高机器人金币倍率",
    baseCost: 160,
    costMultiplier: 1.32,
    // 无限流纯乘法收益道具，解封至工程上限（见 docs/05 §6）。
    maxLevel: MAX_SHOP_LEVEL,
    unlockCondition: { type: "item_level", itemId: "robot_archer", level: 5 },
  },
  {
    id: "coin_pet",
    name: "金币宠物",
    description: "提升宠物移动和拾取能力",
    baseCost: 300,
    costMultiplier: 1.35,
    maxLevel: 30,
    unlockCondition: {
      type: "any",
      conditions: [
        { type: "item_level", itemId: "greedy_coin", level: 8 },
        { type: "cleared_level", levelId: 5 },
      ],
    },
  },
] as const;
