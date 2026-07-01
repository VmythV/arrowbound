import { CENTER_RING_RATIO_CAP } from "../config/game.constants";

/**
 * 每级精准瞄准为十环基础半径增加的占比（1 个百分点）。
 */
export const PRECISE_AIM_CENTER_BONUS_PER_LEVEL = 0.01;

/**
 * 命中判定使用的浮点容差，保证边界点稳定归入内侧（更高）的环。
 */
const RING_BOUNDARY_EPSILON = 1e-9;

/**
 * 求解一次命中环数所需的全部输入。数值来自关卡基础配置、商店等级与祝福倍率，
 * 由调用方在生成时固定，之后不随状态变化而改变已生成金币的价值。
 */
export type RingScoringConfig = {
  /** 关卡基础靶子半径（像素）。 */
  readonly baseTargetRadius: number;
  /** 关卡基础十环占比。 */
  readonly centerRingRatio: number;
  /** 精准瞄准商店等级，取值 [0, maxLevel]。 */
  readonly preciseAimLevel: number;
  /** 巨大靶心祝福倍率，未生效时为 1。 */
  readonly centerBlessingMultiplier: number;
  /** 宽大靶子祝福倍率，未生效时为 1。 */
  readonly wideTargetMultiplier: number;
};

/**
 * 命中的最终判定结果。`ring` 为 0 表示脱靶，1～10 表示对应环数。
 */
export type RingResult = {
  readonly hit: boolean;
  readonly ring: number;
};

/**
 * 应用宽大靶子祝福后的实际靶子半径。
 */
export function effectiveTargetRadius(config: RingScoringConfig): number {
  return config.baseTargetRadius * config.wideTargetMultiplier;
}

/**
 * 计算商店与祝福加成后的十环占比，最终受 30% 上限约束。
 */
export function effectiveCenterRatio(config: RingScoringConfig): number {
  const shopCenterBonus = PRECISE_AIM_CENTER_BONUS_PER_LEVEL * config.preciseAimLevel;
  const blessedCenterRatio =
    (config.centerRingRatio + shopCenterBonus) * config.centerBlessingMultiplier;
  return Math.min(blessedCenterRatio, CENTER_RING_RATIO_CAP);
}

/**
 * 根据归一化半径（命中点到靶心距离 / 靶子半径）与十环占比求解环数。
 *
 * 区间规则采用“内边界不含、外边界包含”：
 * - 10 环：`d <= centerRatio`
 * - 9～2 环：从靶心向外依次按等宽划分
 * - 1 环：最后一个区间，包含靶子外边界（`d = 1`）
 * - 脱靶：`d > 1`
 */
export function ringFromNormalizedDistance(
  normalizedDistance: number,
  centerRatio: number,
): number {
  if (!Number.isFinite(normalizedDistance) || normalizedDistance < 0) {
    throw new RangeError("Normalized distance must be finite and non-negative");
  }
  if (!Number.isFinite(centerRatio) || centerRatio <= 0 || centerRatio >= 1) {
    throw new RangeError("Center ratio must be finite and within (0, 1)");
  }

  if (normalizedDistance <= centerRatio + RING_BOUNDARY_EPSILON) {
    return 10;
  }
  if (normalizedDistance > 1 + RING_BOUNDARY_EPSILON) {
    return 0;
  }

  const otherRingWidth = (1 - centerRatio) / 9;
  for (let ring = 9; ring >= 1; ring -= 1) {
    const outerBoundary = centerRatio + (10 - ring) * otherRingWidth;
    if (normalizedDistance <= outerBoundary + RING_BOUNDARY_EPSILON) {
      return ring;
    }
  }
  // 浮点兜底：落在 1 环外边界附近时仍归入 1 环。
  return 1;
}

/**
 * 根据命中点到靶心的像素距离求解环数与命中结果。
 */
export function resolveRing(distanceFromCenter: number, config: RingScoringConfig): RingResult {
  if (!Number.isFinite(distanceFromCenter) || distanceFromCenter < 0) {
    throw new RangeError("Distance from center must be finite and non-negative");
  }
  const radius = effectiveTargetRadius(config);
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError("Effective target radius must be finite and positive");
  }
  const ring = ringFromNormalizedDistance(distanceFromCenter / radius, effectiveCenterRatio(config));
  return { hit: ring >= 1, ring };
}
