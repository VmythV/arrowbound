import { BLESSING_CONFIGS, type BlessingConfig, type BlessingId } from "../config/blessing.config";

/**
 * 单个已选祝福对本关玩法的全部修正。每关最多一个祝福生效，因此至多一个字段偏离中性值。
 */
export type BlessingEffects = {
  /** 所有金币价值倍率（金币祝福），同时作用于玩家与机器人。 */
  readonly allCoinMultiplier: number;
  /** 十环金币额外倍率（十环狂热）。 */
  readonly tenRingMultiplier: number;
  /** 十环半径倍率（巨大靶心）。 */
  readonly centerRadiusMultiplier: number;
  /** 靶子总半径倍率（宽大靶子）。 */
  readonly targetRadiusMultiplier: number;
  /** 弓摆动速度倍率（稳定拉弓）。 */
  readonly bowSpeedMultiplier: number;
  /** 玩家最终冷却倍率（快速射击），仍受 0.35 秒下限约束。 */
  readonly cooldownMultiplier: number;
  /** 机器人射击间隔除数（机械狂欢）。 */
  readonly robotIntervalDivisor: number;
  /** 机器人抽到低环时的最低环数（机械校准）；0 表示不生效。 */
  readonly robotMinimumRing: number;
  /** 宠物拾取间隔除数（宠物兴奋）。 */
  readonly petIntervalDivisor: number;
  /** 是否为幸运首箭祝福。 */
  readonly luckyFirstTen: boolean;
};

export const NEUTRAL_BLESSING_EFFECTS: BlessingEffects = {
  allCoinMultiplier: 1,
  tenRingMultiplier: 1,
  centerRadiusMultiplier: 1,
  targetRadiusMultiplier: 1,
  bowSpeedMultiplier: 1,
  cooldownMultiplier: 1,
  robotIntervalDivisor: 1,
  robotMinimumRing: 0,
  petIntervalDivisor: 1,
  luckyFirstTen: false,
};

const CONFIG_BY_ID = new Map<BlessingId, BlessingConfig>(
  BLESSING_CONFIGS.map((config) => [config.id, config]),
);

/**
 * 将已选祝福 id 解析为对应的玩法修正；未选择时返回中性值。
 */
export function resolveBlessingEffects(blessingId: string | undefined): BlessingEffects {
  if (blessingId === undefined) {
    return NEUTRAL_BLESSING_EFFECTS;
  }
  const config = CONFIG_BY_ID.get(blessingId as BlessingId);
  if (config === undefined) {
    return NEUTRAL_BLESSING_EFFECTS;
  }

  switch (config.effectType) {
    case "all_coin_multiplier":
      return { ...NEUTRAL_BLESSING_EFFECTS, allCoinMultiplier: config.value };
    case "ten_ring_coin_multiplier":
      return { ...NEUTRAL_BLESSING_EFFECTS, tenRingMultiplier: config.value };
    case "center_radius_multiplier":
      return { ...NEUTRAL_BLESSING_EFFECTS, centerRadiusMultiplier: config.value };
    case "target_radius_multiplier":
      return { ...NEUTRAL_BLESSING_EFFECTS, targetRadiusMultiplier: config.value };
    case "bow_speed_multiplier":
      return { ...NEUTRAL_BLESSING_EFFECTS, bowSpeedMultiplier: config.value };
    case "player_cooldown_multiplier":
      return { ...NEUTRAL_BLESSING_EFFECTS, cooldownMultiplier: config.value };
    case "robot_interval_divisor":
      return { ...NEUTRAL_BLESSING_EFFECTS, robotIntervalDivisor: config.value };
    case "robot_minimum_ring":
      return { ...NEUTRAL_BLESSING_EFFECTS, robotMinimumRing: config.value };
    case "pet_interval_divisor":
      return { ...NEUTRAL_BLESSING_EFFECTS, petIntervalDivisor: config.value };
    case "lucky_first_ten":
      return { ...NEUTRAL_BLESSING_EFFECTS, luckyFirstTen: true };
  }
}
