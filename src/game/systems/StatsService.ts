import type { GameEventBus } from "../events/GameEventBus";
import type { ProjectileResolution } from "./ProjectileSystem";

export type StatsSnapshot = {
  readonly totalShots: number;
  readonly totalHits: number;
  readonly totalTenRingHits: number;
};

function sanitizeCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

/**
 * 累计统计（发射数、命中数、手动十环数）的内存态持有者，从存档 seed。
 * 订阅玩家射击与命中事件累加；累计金币收益由 CoinLedger 单独持有。
 */
export class StatsService {
  private totalShots: number;
  private totalHits: number;
  private totalTenRingHits: number;

  constructor(
    private readonly events: GameEventBus,
    initial: StatsSnapshot = { totalShots: 0, totalHits: 0, totalTenRingHits: 0 },
  ) {
    this.totalShots = sanitizeCount(initial.totalShots);
    this.totalHits = sanitizeCount(initial.totalHits);
    this.totalTenRingHits = sanitizeCount(initial.totalTenRingHits);
    this.events.on("shot:fired", this.handleShotFired, this);
    this.events.on("arrow:resolved", this.handleArrowResolved, this);
  }

  snapshot(): StatsSnapshot {
    return {
      totalShots: this.totalShots,
      totalHits: this.totalHits,
      totalTenRingHits: this.totalTenRingHits,
    };
  }

  destroy(): void {
    this.events.off("shot:fired", this.handleShotFired, this);
    this.events.off("arrow:resolved", this.handleArrowResolved, this);
  }

  private handleShotFired(): void {
    this.totalShots += 1;
  }

  private handleArrowResolved(resolution: ProjectileResolution): void {
    // 只统计玩家手动射击的命中与十环。
    if (resolution.runtimeData.source !== "player") {
      return;
    }
    if (!resolution.hit) {
      return;
    }
    this.totalHits += 1;
    if (resolution.ring === 10) {
      this.totalTenRingHits += 1;
    }
  }
}
