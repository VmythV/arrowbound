export type CoinSource = "player" | "robot";

/**
 * 计算一枚金币最终价值所需的收益倍率上下文。商店等级与祝福倍率由调用方在
 * 金币生成时固定，之后不再改变已生成金币的价值。
 */
export type CoinIncomeContext = {
  /** 贪婪金币商店等级，作用于手动收益。 */
  readonly greedyCoinLevel: number;
  /** 机械贪婪商店等级，作用于机器人收益。 */
  readonly robotGreedLevel: number;
  /** “所有金币”祝福倍率（金币祝福），未生效时为 1，同时作用于玩家与机器人。 */
  readonly allCoinMultiplier: number;
  /** 十环专属祝福倍率（十环狂热），未生效时为 1，仅作用于 10 环。 */
  readonly tenRingMultiplier: number;
};

// 无限流经济：贪婪金币与机械贪婪改为乘法复利（每级 ×1.10），使收入能随等级几何增长、
// 长时间追上几何增长的通关目标（见 docs/05 §3）。两者同速率增长，保持手动:机器人收益比恒定。
const MANUAL_GREED_RATE = 1.1;
const ROBOT_BASE_MULTIPLIER = 0.7;
const ROBOT_GREED_RATE = 1.1;

/**
 * 手动收益倍率：`1.10 ^ greedyCoinLevel`（等级 0 为 1）。
 */
export function manualCoinMultiplier(greedyCoinLevel: number): number {
  assertLevel(greedyCoinLevel, "greedyCoinLevel");
  return MANUAL_GREED_RATE ** greedyCoinLevel;
}

/**
 * 机器人收益倍率：`0.7 × 1.10 ^ robotGreedLevel`（等级 0 为 0.7）。
 */
export function robotCoinMultiplier(robotGreedLevel: number): number {
  assertLevel(robotGreedLevel, "robotGreedLevel");
  return ROBOT_BASE_MULTIPLIER * ROBOT_GREED_RATE ** robotGreedLevel;
}

/**
 * 根据环数、收益来源和倍率上下文求解金币最终价值。
 *
 * 叠加顺序（见 05 文档 3.3）：基础环数 × 系统倍率 × 所有金币祝福 × 环数专属祝福，
 * 最终统一向下取整。命中 1～10 环至少产生 1 金币；脱靶（ring < 1）产生 0。
 */
export function computeCoinValue(
  ring: number,
  source: CoinSource,
  context: CoinIncomeContext,
): number {
  if (!Number.isInteger(ring) || ring < 0 || ring > 10) {
    throw new RangeError("Ring must be an integer within [0, 10]");
  }
  assertMultiplier(context.allCoinMultiplier, "allCoinMultiplier");
  assertMultiplier(context.tenRingMultiplier, "tenRingMultiplier");

  if (ring < 1) {
    return 0;
  }

  const systemMultiplier =
    source === "player"
      ? manualCoinMultiplier(context.greedyCoinLevel)
      : robotCoinMultiplier(context.robotGreedLevel);
  const ringSpecificMultiplier = ring === 10 ? context.tenRingMultiplier : 1;
  const rawValue = ring * systemMultiplier * context.allCoinMultiplier * ringSpecificMultiplier;

  return Math.max(1, Math.floor(rawValue));
}

function assertLevel(level: number, label: string): void {
  if (!Number.isFinite(level) || level < 0) {
    throw new RangeError(`${label} must be finite and non-negative`);
  }
}

function assertMultiplier(multiplier: number, label: string): void {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new RangeError(`${label} must be finite and positive`);
  }
}
