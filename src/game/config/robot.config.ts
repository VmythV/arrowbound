export type RobotAimWeight = {
  readonly ring: number;
  readonly weight: number;
};

export type RobotConfig = {
  readonly baseShotIntervalSeconds: number;
  readonly maximumInitialDelaySeconds: number;
  readonly baseCoinMultiplier: number;
  readonly greedBonusPerLevel: number;
  readonly aimWeights: readonly RobotAimWeight[];
};

export const ROBOT_CONFIG: RobotConfig = {
  baseShotIntervalSeconds: 4,
  maximumInitialDelaySeconds: 0.4,
  baseCoinMultiplier: 0.7,
  greedBonusPerLevel: 0.08,
  aimWeights: [
    { ring: 1, weight: 20 },
    { ring: 2, weight: 18 },
    { ring: 3, weight: 16 },
    { ring: 4, weight: 13 },
    { ring: 5, weight: 10 },
    { ring: 6, weight: 8 },
    { ring: 7, weight: 6 },
    { ring: 8, weight: 4 },
    { ring: 9, weight: 3 },
    { ring: 10, weight: 2 },
  ],
} as const;
