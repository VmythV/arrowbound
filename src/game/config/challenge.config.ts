import { CHALLENGE_DURATION_SECONDS } from "./game.constants";

export type ChallengeRewardType = "coins" | "shop_level" | "extra_blessing_choice";

export type ChallengeRewardConfig = {
  readonly type: ChallengeRewardType;
  readonly weight: number;
};

export type ChallengeConfig = {
  readonly durationSeconds: number;
  readonly rewards: readonly ChallengeRewardConfig[];
  readonly coinRewardClearGoalRatio: number;
};

export const CHALLENGE_CONFIG: ChallengeConfig = {
  durationSeconds: CHALLENGE_DURATION_SECONDS,
  rewards: [
    { type: "coins", weight: 70 },
    { type: "shop_level", weight: 20 },
    { type: "extra_blessing_choice", weight: 10 },
  ],
  coinRewardClearGoalRatio: 0.2,
} as const;
