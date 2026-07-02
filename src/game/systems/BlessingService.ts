import {
  BLESSING_CONFIGS,
  type BlessingAvailability,
  type BlessingConfig,
} from "../config/blessing.config";
import type { RandomService } from "../utils/random";

/** 祝福候选可用性判定所需的系统解锁状态。 */
export type BlessingAvailabilityContext = {
  readonly hasRobot: boolean;
  readonly hasCoinPet: boolean;
};

export type BlessingDraw = {
  readonly candidates: readonly BlessingConfig[];
  /** 本次是否消耗了一次额外候选次数（4 选 1）。 */
  readonly usedExtraChoice: boolean;
};

const BASE_CANDIDATE_COUNT = 3;

function isAvailable(availability: BlessingAvailability, context: BlessingAvailabilityContext): boolean {
  switch (availability) {
    case "always":
      return true;
    case "has_robot":
      return context.hasRobot;
    case "has_coin_pet":
      return context.hasCoinPet;
  }
}

/**
 * 祝福抽取与额外候选次数的内存态管理。抽样走注入的 RandomService，测试可用固定种子。
 * 每关首次进入抽取 3 个不重复候选；存在待用额外候选次数时抽 4 个并消耗 1 次。
 * 持久化随阶段 11 接入 SaveRepository。
 */
export class BlessingService {
  private extraChoices: number;

  constructor(
    private readonly random: RandomService,
    initialExtraChoices = 0,
  ) {
    this.extraChoices = Math.max(0, Math.floor(initialExtraChoices));
  }

  get pendingExtraChoices(): number {
    return this.extraChoices;
  }

  /** 挑战奖励发放额外候选次数（阶段 7）。 */
  grantExtraChoice(): void {
    this.extraChoices += 1;
  }

  /**
   * 为一个新关卡抽取候选祝福。可用祝福不足以生成所需数量时视为配置错误并抛出。
   */
  drawCandidates(context: BlessingAvailabilityContext): BlessingDraw {
    const available = BLESSING_CONFIGS.filter((config) => isAvailable(config.availability, context));
    const usedExtraChoice = this.extraChoices > 0;
    const count = BASE_CANDIDATE_COUNT + (usedExtraChoice ? 1 : 0);
    if (available.length < count) {
      throw new Error(
        `Not enough available blessings (${available.length}) to draw ${count} candidates`,
      );
    }

    const candidates = this.random.weightedSampleWithoutReplacement(
      available.map((config) => ({ value: config, weight: config.weight })),
      count,
    );
    if (usedExtraChoice) {
      this.extraChoices -= 1;
    }
    return { candidates, usedExtraChoice };
  }
}
