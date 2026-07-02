import type { GameEventBus } from "../events/GameEventBus";
import type { RuntimeState } from "../state/RuntimeState";
import type { CoinSource } from "./coin-income";
import type { Point } from "../utils/ballistics";

/**
 * 挑战计分所需的最小状态接口，由 StateController 满足，测试可注入替身。
 */
export type ChallengeScoring = {
  readonly snapshot: Pick<RuntimeState, "isChallengeActive" | "challengeRunId">;
  addChallengeScore(value: number): void;
};

export type CoinCollectionInput = {
  /** 金币掉落物的唯一标识，用于保证同一枚金币只入账一次。 */
  readonly id: number;
  readonly value: number;
  readonly source: CoinSource;
  /** 金币生成时绑定的挑战运行 ID；仅在与当前挑战匹配时计入挑战分数。 */
  readonly challengeRunId?: string;
  /** 命中/掉落点，供 HUD 反馈定位，可选。 */
  readonly point?: Point;
};

/**
 * 金币入账的唯一入口。鼠标与宠物拾取都必须经过 `collectCoin`，保证：
 * - 同一枚金币不会被重复计入钱包（按 id 去重）；
 * - 钱包与累计统计同步增长；
 * - 命中挑战规则时增加挑战分数。
 *
 * 首版为内存态钱包，持久化在阶段 11 接入 SaveRepository 后由外部注入初始值并订阅事件保存。
 */
export class CoinLedger {
  private balance: number;
  private totalEarned: number;
  private readonly collectedIds = new Set<number>();

  constructor(
    private readonly events: GameEventBus,
    private readonly challenge: ChallengeScoring,
    initialBalance = 0,
    initialTotalEarned = 0,
  ) {
    this.balance = CoinLedger.sanitizeAmount(initialBalance);
    this.totalEarned = CoinLedger.sanitizeAmount(initialTotalEarned);
  }

  get coins(): number {
    return this.balance;
  }

  get totalCoinsEarned(): number {
    return this.totalEarned;
  }

  /**
   * 将一枚金币入账。返回 `true` 表示本次为首次入账，`false` 表示该金币已被拾取过，
   * 调用方应据此避免重复播放拾取表现。
   */
  collectCoin(input: CoinCollectionInput): boolean {
    if (!Number.isInteger(input.value) || input.value < 1) {
      throw new RangeError("Coin value must be a positive integer");
    }
    if (this.collectedIds.has(input.id)) {
      return false;
    }
    this.collectedIds.add(input.id);
    this.balance += input.value;
    this.totalEarned += input.value;

    const snapshot = this.challenge.snapshot;
    if (
      snapshot.isChallengeActive &&
      input.challengeRunId !== undefined &&
      input.challengeRunId === snapshot.challengeRunId
    ) {
      this.challenge.addChallengeScore(input.value);
    }

    const payload: { value: number; coins: number; source: CoinSource; point?: Point } = {
      value: input.value,
      coins: this.balance,
      source: input.source,
    };
    if (input.point !== undefined) {
      payload.point = input.point;
    }
    this.events.emit("coin:collected", payload);
    this.events.emit("wallet:changed", { coins: this.balance, delta: input.value, reason: "collect" });
    return true;
  }

  /**
   * 直接向钱包发放奖励金币（宝箱、幸运首箭等），计入累计统计但不经拾取流程。
   */
  grantReward(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new RangeError("Reward amount must be a non-negative integer");
    }
    if (amount === 0) {
      return;
    }
    this.balance += amount;
    this.totalEarned += amount;
    this.events.emit("wallet:changed", { coins: this.balance, delta: amount, reason: "reward" });
  }

  /**
   * 从钱包扣除金币，余额不足时返回 false 且不改动余额（供普通通关等一次性支出使用）。
   */
  spend(amount: number): boolean {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new RangeError("Spend amount must be a non-negative integer");
    }
    if (amount === 0) {
      return true;
    }
    if (this.balance < amount) {
      return false;
    }
    this.balance -= amount;
    this.events.emit("wallet:changed", { coins: this.balance, delta: -amount, reason: "spend" });
    return true;
  }

  /**
   * 关卡切换或卸载时清空去重记录，新关卡的金币重新计数。
   */
  resetLevelTracking(): void {
    this.collectedIds.clear();
  }

  private static sanitizeAmount(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) {
      return 0;
    }
    return Math.floor(amount);
  }
}
