import type { GameEventBus } from "../events/GameEventBus";
import { CURRENT_SAVE_VERSION, type SaveData } from "../state/SaveData";
import type { BlessingService } from "../systems/BlessingService";
import type { CoinLedger } from "../systems/CoinLedger";
import type { GameClock, ClockTaskId } from "../systems/GameClock";
import type { ProgressionService } from "../systems/ProgressionService";
import type { RewardService } from "../systems/RewardService";
import type { SettingsService } from "../systems/SettingsService";
import type { ShopService } from "../systems/ShopService";
import type { StatsService } from "../systems/StatsService";
import type { SaveRepository } from "./SaveRepository";

export type SaveServiceDependencies = {
  readonly events: GameEventBus;
  readonly clock: GameClock;
  readonly repository: SaveRepository;
  readonly ledger: CoinLedger;
  readonly progression: ProgressionService;
  readonly shop: ShopService;
  readonly blessings: BlessingService;
  readonly rewards: RewardService;
  readonly settings: SettingsService;
  readonly stats: StatsService;
};

const COIN_SAVE_DEBOUNCE_MS = 2_000;

/**
 * 存档编排：从各内存态服务组装 SaveData 快照并落盘。普通金币变化最多 2 秒防抖保存；
 * 购买、祝福、通关、挑战、宝箱、奖励次数等关键变化立即保存；页面关闭前强制冲刷。
 */
export class SaveService {
  private debounceTaskId: ClockTaskId | undefined;

  constructor(private readonly deps: SaveServiceDependencies) {
    const events = deps.events;
    events.on("wallet:changed", this.handleWalletChanged, this);
    events.on("shop:purchased", this.saveNow, this);
    events.on("shop:changed", this.saveNow, this);
    events.on("blessing:selected", this.saveNow, this);
    events.on("blessing:offer", this.saveNow, this);
    events.on("reward:queued", this.saveNow, this);
    events.on("reward:done", this.saveNow, this);
    events.on("challenge:ended", this.saveNow, this);
    events.on("level:changed", this.saveNow, this);
    events.on("settings:changed", this.saveNow, this);
  }

  buildSnapshot(): SaveData {
    const progress = this.deps.progression.toSaveData();
    return {
      version: CURRENT_SAVE_VERSION,
      player: {
        coins: this.deps.ledger.coins,
        currentLevel: progress.currentLevel,
        maxUnlockedLevel: progress.maxUnlockedLevel,
      },
      shop: this.deps.shop.toSaveData(),
      levels: progress.levels,
      rewards: {
        pendingExtraBlessingChoices: this.deps.blessings.pendingExtraChoices,
        pendingRewards: [...this.deps.rewards.pending],
      },
      settings: this.deps.settings.toSaveData(),
      stats: {
        ...this.deps.stats.snapshot(),
        totalCoinsEarned: this.deps.ledger.totalCoinsEarned,
      },
    };
  }

  /**
   * 立即保存当前完整进度。
   */
  readonly saveNow = (): void => {
    this.cancelDebounce();
    this.deps.repository.save(this.buildSnapshot());
  };

  /**
   * 页面关闭前冲刷任何待保存的变化。
   */
  flush(): void {
    this.saveNow();
  }

  destroy(): void {
    this.cancelDebounce();
    const events = this.deps.events;
    events.off("wallet:changed", this.handleWalletChanged, this);
    events.off("shop:purchased", this.saveNow, this);
    events.off("shop:changed", this.saveNow, this);
    events.off("blessing:selected", this.saveNow, this);
    events.off("blessing:offer", this.saveNow, this);
    events.off("reward:queued", this.saveNow, this);
    events.off("reward:done", this.saveNow, this);
    events.off("challenge:ended", this.saveNow, this);
    events.off("level:changed", this.saveNow, this);
    events.off("settings:changed", this.saveNow, this);
  }

  private handleWalletChanged({ reason }: { reason: string }): void {
    if (reason === "collect") {
      this.scheduleDebouncedSave();
    } else {
      this.saveNow();
    }
  }

  private scheduleDebouncedSave(): void {
    this.cancelDebounce();
    this.debounceTaskId = this.deps.clock.schedule(COIN_SAVE_DEBOUNCE_MS, () => {
      this.debounceTaskId = undefined;
      this.deps.repository.save(this.buildSnapshot());
    });
  }

  private cancelDebounce(): void {
    if (this.debounceTaskId !== undefined) {
      this.deps.clock.cancel(this.debounceTaskId);
      this.debounceTaskId = undefined;
    }
  }
}
