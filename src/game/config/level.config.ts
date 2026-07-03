import { CHALLENGE_DURATION_SECONDS, MAX_LEVEL_ID } from "./game.constants";

export type TargetConfig = {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly centerRingRatio: number;
};

export type BowConfig = {
  readonly swingMinAngle: number;
  readonly swingMaxAngle: number;
  readonly swingSpeed: number;
};

export type ArrowConfig = {
  readonly speed: number;
  readonly gravity: number;
};

export type LevelConfig = {
  readonly id: number;
  readonly name: string;
  readonly clearCoinGoal: number;
  readonly challengeTargetCoins: number;
  readonly challengeDurationSeconds: number;
  readonly target: TargetConfig;
  readonly bow: BowConfig;
  readonly arrow: ArrowConfig;
};

export const LEVEL_CONFIGS: readonly LevelConfig[] = [
  createLevel(1, "新手靶场", 100, 30, 850, 390, 90, 0.12, -40, 5, 24, 900, 600),
  createLevel(2, "林间靶场", 220, 70, 880, 350, 85, 0.11, -42, 5, 28, 900, 620),
  createLevel(3, "溪谷靶场", 380, 120, 920, 420, 82, 0.1, -42, 8, 32, 900, 650),
  createLevel(4, "风丘靶场", 600, 190, 960, 360, 78, 0.095, -44, 8, 41, 920, 680),
  createLevel(5, "遗迹靶场", 900, 280, 1000, 400, 75, 0.09, -45, 10, 44, 940, 720),
  createLevel(6, "峡谷靶场", 1350, 420, 1020, 330, 72, 0.09, -47, 10, 47, 950, 750),
  createLevel(7, "暮色靶场", 2000, 620, 1040, 440, 70, 0.085, -47, 12, 50, 960, 780),
  createLevel(8, "雪原靶场", 3000, 930, 1060, 370, 68, 0.085, -49, 12, 53, 980, 820),
  createLevel(9, "熔岩靶场", 4500, 1400, 1080, 420, 65, 0.08, -50, 14, 56, 1000, 860),
  createLevel(10, "星辉靶场", 6800, 2100, 1100, 340, 62, 0.08, -52, 14, 60, 1020, 900),
] as const;

/** 手工调校关卡数量（前 10 关）。第 11 关起程序化生成。 */
export const HANDCRAFTED_LEVEL_COUNT = LEVEL_CONFIGS.length;

const HANDCRAFTED_BY_ID = new Map<number, LevelConfig>(
  LEVEL_CONFIGS.map((level) => [level.id, level]),
);

/** 无限流关卡命名主题池，按 id 循环并叠加周目（见 docs/05 §4.1）。 */
const LEVEL_THEME_NAMES = [
  "新手",
  "林间",
  "溪谷",
  "风丘",
  "遗迹",
  "峡谷",
  "暮色",
  "雪原",
  "熔岩",
  "星辉",
] as const;

const generatedCache = new Map<number, LevelConfig>();

/**
 * 返回指定关卡配置：1～10 关为手工配置，11～`MAX_LEVEL_ID` 关按 docs/05 §4.1 公式生成并缓存。
 * 非整数、小于 1 或大于 `MAX_LEVEL_ID` 的 id 返回 undefined。
 */
export function getLevelConfig(id: number): LevelConfig | undefined {
  if (!Number.isInteger(id) || id < 1 || id > MAX_LEVEL_ID) {
    return undefined;
  }
  const handcrafted = HANDCRAFTED_BY_ID.get(id);
  if (handcrafted !== undefined) {
    return handcrafted;
  }
  const cached = generatedCache.get(id);
  if (cached !== undefined) {
    return cached;
  }
  const generated = generateLevelConfig(id);
  generatedCache.set(id, generated);
  return generated;
}

/**
 * 按第 10 关基线与几何收敛因子生成第 11 关起的关卡（见 docs/05 §4.1）。
 * 通关目标按 1.5 倍几何增长，几何难度向固定上限平滑收敛。
 */
function generateLevelConfig(id: number): LevelConfig {
  const k = id - HANDCRAFTED_LEVEL_COUNT; // >= 1
  const d = 0.82 ** k; // 收敛因子，随关卡趋近 0

  // 无限流跑步机：通关目标几何增长。倍率从 1.5 下调到 1.35，配合乘法复利收入，
  // 让可持续游玩的关卡数显著后移（见 docs/05 §4.1）。
  const clearCoinGoal = Math.round((6800 * 1.35 ** k) / 100) * 100;
  const challengeTargetCoins = Math.round((clearCoinGoal * 0.3) / 10) * 10;

  const themeIndex = (id - 1) % LEVEL_THEME_NAMES.length;
  const cycle = Math.floor((id - 1) / LEVEL_THEME_NAMES.length) + 1;
  const name = `${LEVEL_THEME_NAMES[themeIndex]}靶场·${cycle}周目`;

  return {
    id,
    name,
    clearCoinGoal,
    challengeTargetCoins,
    challengeDurationSeconds: CHALLENGE_DURATION_SECONDS,
    target: {
      x: Math.round(1160 - 60 * d),
      y: 320 + ((id * 137) % 120),
      radius: Math.round(50 + 12 * d),
      centerRingRatio: Math.round((0.065 + 0.015 * d) * 1000) / 1000,
    },
    bow: {
      swingMinAngle: -52,
      swingMaxAngle: 14,
      swingSpeed: Math.round(78 - 18 * d),
    },
    arrow: {
      speed: Math.round(1120 - 100 * d),
      gravity: Math.round(980 - 80 * d),
    },
  };
}

function createLevel(
  id: number,
  name: string,
  clearCoinGoal: number,
  challengeTargetCoins: number,
  targetX: number,
  targetY: number,
  targetRadius: number,
  centerRingRatio: number,
  swingMinAngle: number,
  swingMaxAngle: number,
  swingSpeed: number,
  arrowSpeed: number,
  gravity: number,
): LevelConfig {
  return {
    id,
    name,
    clearCoinGoal,
    challengeTargetCoins,
    challengeDurationSeconds: CHALLENGE_DURATION_SECONDS,
    target: { x: targetX, y: targetY, radius: targetRadius, centerRingRatio },
    bow: { swingMinAngle, swingMaxAngle, swingSpeed },
    arrow: { speed: arrowSpeed, gravity },
  };
}
