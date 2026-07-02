import type { ShopItemId } from "../config/shop.config";
import type { GameEventBus } from "../events/GameEventBus";
import type { PendingReward } from "../state/SaveData";
import type { RandomService } from "../utils/random";

const CHALLENGE_COIN_RATIO = 0.2;
const LUCKY_FIRST_TEN_RATIO = 0.1;
const COINS_ROLL_CEILING = 0.7;
const SHOP_LEVEL_ROLL_CEILING = 0.9;

export type ChallengeRewardContext = {
  readonly levelId: number;
  readonly clearCoinGoal: number;
  /** 已解锁且未满级的商品，供免费升级奖励抽取；为空时改发金币。 */
  readonly freeUpgradeItems: readonly ShopItemId[];
};

/**
 * 奖励抽取与待领取队列。抽奖走注入的 RandomService；奖励先写入队列（并在阶段 11
 * 立即持久化）再展示弹窗，确认后才发放并出队，避免刷新重复抽奖或重复发奖。
 */
export class RewardService {
  private readonly queue: PendingReward[] = [];
  private counter = 0;

  constructor(
    private readonly random: RandomService,
    private readonly events: GameEventBus,
  ) {}

  get pending(): readonly PendingReward[] {
    return this.queue;
  }

  get next(): PendingReward | undefined {
    return this.queue[0];
  }

  /**
   * 抽取挑战宝箱奖励：金币 70% / 免费升级 20% / 额外祝福候选 10%；
   * 无可免费升级商品时改发本关金币。
   */
  drawChallengeReward(context: ChallengeRewardContext): PendingReward {
    const roll = this.random.next();
    if (roll < COINS_ROLL_CEILING) {
      return this.coinsReward("challenge", context.levelId, context.clearCoinGoal, CHALLENGE_COIN_RATIO);
    }
    if (roll < SHOP_LEVEL_ROLL_CEILING && context.freeUpgradeItems.length > 0) {
      return {
        id: this.nextId("challenge", context.levelId),
        source: "challenge",
        levelId: context.levelId,
        type: "shop_level",
        shopItemId: this.random.pick(context.freeUpgradeItems),
      };
    }
    if (roll < SHOP_LEVEL_ROLL_CEILING) {
      // 无可升级商品，免费升级转为本关金币奖励。
      return this.coinsReward("challenge", context.levelId, context.clearCoinGoal, CHALLENGE_COIN_RATIO);
    }
    return {
      id: this.nextId("challenge", context.levelId),
      source: "challenge",
      levelId: context.levelId,
      type: "extra_blessing_choice",
    };
  }

  /**
   * 幸运首箭小宝箱：本关通关目标 10% 的金币。
   */
  drawLuckyFirstTen(levelId: number, clearCoinGoal: number): PendingReward {
    return this.coinsReward("lucky_first_ten", levelId, clearCoinGoal, LUCKY_FIRST_TEN_RATIO);
  }

  /**
   * 将奖励追加到待领取队列并广播（阶段 11 在此立即持久化）。
   */
  enqueue(reward: PendingReward): void {
    if (this.queue.some((pending) => pending.id === reward.id)) {
      throw new Error(`Reward ${reward.id} is already queued`);
    }
    this.queue.push(reward);
    this.events.emit("reward:queued", { reward });
  }

  /**
   * 领取队首奖励：先通过回调发放，再出队。队首在领取期间变更视为错误。
   */
  claimNext(grant: (reward: PendingReward) => void): PendingReward | undefined {
    const reward = this.queue[0];
    if (reward === undefined) {
      return undefined;
    }
    grant(reward);
    if (this.queue[0]?.id !== reward.id) {
      throw new Error("Reward queue changed during claim");
    }
    this.queue.shift();
    return reward;
  }

  private coinsReward(
    source: PendingReward["source"],
    levelId: number,
    clearCoinGoal: number,
    ratio: number,
  ): PendingReward {
    return {
      id: this.nextId(source, levelId),
      source,
      levelId,
      type: "coins",
      amount: Math.max(1, Math.floor(clearCoinGoal * ratio)),
    };
  }

  private nextId(source: string, levelId: number): string {
    this.counter += 1;
    return `${source}-${levelId}-${this.counter}`;
  }
}
