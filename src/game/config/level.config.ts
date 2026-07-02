import { CHALLENGE_DURATION_SECONDS } from "./game.constants";

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
