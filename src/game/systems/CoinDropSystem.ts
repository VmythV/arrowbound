import * as Phaser from "phaser";
import { resolveCoinTier } from "../config/coin.config";
import { GAME_WIDTH } from "../config/game.constants";
import { Coin } from "../entities/Coin";
import type { CoinSource } from "./coin-income";
import type { CoinCollectionInput } from "./CoinLedger";
import type { Point } from "../utils/ballistics";

export type CoinDropRequest = {
  /** 命中点，金币从此处沿小抛物线落向地面。 */
  readonly origin: Point;
  readonly value: number;
  readonly source: CoinSource;
  readonly challengeRunId?: string;
};

export type CoinDropSystemConfig = {
  readonly poolTexture: string;
  readonly hudAnchor: Point;
  readonly groundY: number;
  /** 统一入账入口，返回 true 表示本次首次入账。 */
  readonly onCollect: (input: CoinCollectionInput) => boolean;
};

const LANDING_SPREAD = 34;
const LANDING_MARGIN = 60;
const GROUND_OFFSET = 8;

/**
 * 金币掉落物对象池与拾取协调器。生成掉落物、驱动落地表现，并将鼠标悬停拾取
 * 汇入统一 `collectCoin` 入口。宠物拾取后续复用 `collect(coin)`。
 */
export class CoinDropSystem {
  private readonly pool: Phaser.GameObjects.Group;
  private paused = false;
  private nextId = 1;

  constructor(
    scene: Phaser.Scene,
    private readonly config: CoinDropSystemConfig,
  ) {
    this.pool = scene.add.group({ classType: Coin, defaultKey: config.poolTexture });
  }

  get activeCount(): number {
    return this.pool.countActive(true);
  }

  spawn(request: CoinDropRequest): Coin {
    const tier = resolveCoinTier(request.value);
    const coin = this.pool.get(request.origin.x, request.origin.y, tier.assetKey) as Coin | null;
    if (coin === null) {
      throw new Error("Coin pool could not provide a coin");
    }
    const landing: Point = {
      x: Phaser.Math.Clamp(
        request.origin.x + Phaser.Math.Between(-LANDING_SPREAD, LANDING_SPREAD),
        LANDING_MARGIN,
        GAME_WIDTH - LANDING_MARGIN,
      ),
      y: this.config.groundY - GROUND_OFFSET,
    };
    const spawnConfig = {
      id: this.nextId,
      value: request.value,
      source: request.source,
      assetKey: tier.assetKey,
      scale: tier.scale,
      bounces: tier.bounces,
      glow: tier.glow,
      origin: request.origin,
      landing,
      ...(request.challengeRunId !== undefined ? { challengeRunId: request.challengeRunId } : {}),
    };
    this.nextId += 1;
    coin.spawn(spawnConfig);
    coin.setAnimationsPaused(this.paused);
    coin.on(Phaser.Input.Events.POINTER_OVER, () => this.collect(coin));
    return coin;
  }

  /**
   * 拾取一枚金币（鼠标或宠物触发）。暂停期间忽略；重复触发被锁保护。
   */
  collect(coin: Coin): void {
    if (this.paused) {
      return;
    }
    if (!coin.lockForPickup()) {
      return;
    }
    const input: CoinCollectionInput = {
      id: coin.id,
      value: coin.value,
      source: coin.source,
      point: { x: coin.x, y: coin.y },
      ...(coin.challengeRunId !== undefined ? { challengeRunId: coin.challengeRunId } : {}),
    };
    const accounted = this.config.onCollect(input);
    if (!accounted) {
      this.recycle(coin);
      return;
    }
    coin.playPickup(this.config.hudAnchor, () => this.recycle(coin));
  }

  /**
   * 关卡切换时将场上未拾取金币全部收入钱包（经统一入账入口，不含拾取动画），
   * 已锁定或已入账的金币不会重复计入。
   */
  drainToWallet(): void {
    for (const child of this.pool.getChildren()) {
      const coin = child as Coin;
      if (!coin.active || !coin.lockForPickup()) {
        continue;
      }
      const input: CoinCollectionInput = {
        id: coin.id,
        value: coin.value,
        source: coin.source,
        point: { x: coin.x, y: coin.y },
        ...(coin.challengeRunId !== undefined ? { challengeRunId: coin.challengeRunId } : {}),
      };
      this.config.onCollect(input);
      this.recycle(coin);
    }
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) {
      return;
    }
    this.paused = paused;
    for (const child of this.pool.getChildren()) {
      const coin = child as Coin;
      if (coin.active) {
        coin.setAnimationsPaused(paused);
      }
    }
  }

  releaseAll(): void {
    for (const child of this.pool.getChildren()) {
      const coin = child as Coin;
      if (coin.active) {
        this.recycle(coin);
      }
    }
  }

  destroy(): void {
    this.pool.destroy(true);
  }

  private recycle(coin: Coin): void {
    coin.recycle();
    this.pool.killAndHide(coin);
  }
}
