import * as Phaser from "phaser";
import type { Coin } from "../entities/Coin";
import type { Point } from "../utils/ballistics";

export type PetSystemConfig = {
  /** 按当前宠物等级返回进化外观纹理 key。 */
  readonly getTexture: () => string;
  readonly homePoint: Point;
  readonly getMoveSpeed: () => number;
  readonly getPickupIntervalSeconds: () => number;
  readonly getPickupCount: () => number;
  readonly getCollectableCoins: () => Coin[];
  readonly reserve: (coin: Coin) => boolean;
  readonly account: (coin: Coin) => void;
};

const PICKUP_RANGE = 26;
const IDLE_BOB_AMPLITUDE = 6;
const IDLE_BOB_SPEED = 0.0022;

/**
 * 金币宠物：解锁后场上至多一只，自动寻找最近的未锁定金币、寻路拾取，
 * 并复用统一 `collectCoin`（经 reserve/account）。拾取间隔、速度、单次数量随等级变化，
 * 并接入宠物兴奋祝福（间隔已在注入的 getter 中折算）。
 */
export class PetSystem {
  private sprite: Phaser.GameObjects.Image | undefined;
  private targetCoin: Coin | undefined;
  private pickupCooldownLeft = 0;
  private idleTime = 0;
  private paused = false;
  private pickupTween: Phaser.Tweens.Tween | undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: PetSystemConfig,
  ) {}

  get isActive(): boolean {
    return this.sprite !== undefined;
  }

  /**
   * 根据金币宠物是否解锁显示或移除唯一的一只宠物。
   */
  setActive(active: boolean): void {
    if (active) {
      const texture = this.config.getTexture();
      if (this.sprite === undefined) {
        this.sprite = this.scene.add
          .image(this.config.homePoint.x, this.config.homePoint.y, texture)
          .setDepth(40);
        this.pickupCooldownLeft = 0;
      } else if (this.sprite.texture.key !== texture) {
        // 升级跨越进化阈值时切换外观。
        this.sprite.setTexture(texture);
      }
    } else if (this.sprite !== undefined) {
      this.releaseSprite();
    }
  }

  update(deltaMs: number): void {
    const sprite = this.sprite;
    if (sprite === undefined || this.paused || deltaMs <= 0) {
      return;
    }
    const deltaSeconds = deltaMs / 1_000;
    this.pickupCooldownLeft = Math.max(0, this.pickupCooldownLeft - deltaSeconds);

    if (this.targetCoin !== undefined && !this.targetCoin.active) {
      this.targetCoin = undefined;
    }
    if (this.targetCoin === undefined) {
      this.acquireTarget(sprite);
    }

    const target = this.targetCoin;
    if (target === undefined) {
      this.idleTime += deltaMs;
      const bob = Math.sin(this.idleTime * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE;
      this.moveToward(sprite, { x: this.config.homePoint.x, y: this.config.homePoint.y + bob }, deltaSeconds);
      return;
    }

    this.moveToward(sprite, { x: target.x, y: target.y }, deltaSeconds);
    if (
      this.pickupCooldownLeft <= 0 &&
      Phaser.Math.Distance.Between(sprite.x, sprite.y, target.x, target.y) <= PICKUP_RANGE
    ) {
      this.performPickup();
      this.pickupCooldownLeft = Math.max(0.1, this.config.getPickupIntervalSeconds());
    }
  }

  setAnimationsPaused(paused: boolean): void {
    if (paused === this.paused) {
      return;
    }
    this.paused = paused;
    if (paused) {
      this.pickupTween?.pause();
    } else {
      this.pickupTween?.resume();
    }
  }

  destroy(): void {
    this.releaseSprite();
  }

  private acquireTarget(sprite: Phaser.GameObjects.Image): void {
    const nearest = this.nearestCollectable(sprite.x, sprite.y);
    if (nearest !== undefined && this.config.reserve(nearest)) {
      this.targetCoin = nearest;
    }
  }

  private performPickup(): void {
    const target = this.targetCoin;
    if (target === undefined) {
      return;
    }
    this.config.account(target);
    this.targetCoin = undefined;
    let collected = 1;
    const count = this.config.getPickupCount();
    const sprite = this.sprite;
    while (collected < count && sprite !== undefined) {
      const nearest = this.nearestCollectable(sprite.x, sprite.y);
      if (nearest === undefined || !this.config.reserve(nearest)) {
        break;
      }
      this.config.account(nearest);
      collected += 1;
    }
    this.playPickupAnimation();
  }

  private nearestCollectable(x: number, y: number): Coin | undefined {
    let nearest: Coin | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const coin of this.config.getCollectableCoins()) {
      const distance = Phaser.Math.Distance.Between(x, y, coin.x, coin.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = coin;
      }
    }
    return nearest;
  }

  private moveToward(sprite: Phaser.GameObjects.Image, destination: Point, deltaSeconds: number): void {
    const step = this.config.getMoveSpeed() * deltaSeconds;
    const dx = destination.x - sprite.x;
    const dy = destination.y - sprite.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= step || distance === 0) {
      sprite.setPosition(destination.x, destination.y);
      return;
    }
    sprite.setPosition(sprite.x + (dx / distance) * step, sprite.y + (dy / distance) * step);
    sprite.setFlipX(dx < 0);
  }

  private playPickupAnimation(): void {
    const sprite = this.sprite;
    if (sprite === undefined) {
      return;
    }
    this.pickupTween?.stop();
    sprite.setScale(1);
    this.pickupTween = this.scene.tweens.add({
      targets: sprite,
      scale: { from: 1.18, to: 1 },
      duration: 200,
      ease: "Quad.Out",
      paused: this.paused,
      onComplete: () => {
        sprite.setScale(1);
        this.pickupTween = undefined;
      },
    });
  }

  private releaseSprite(): void {
    this.pickupTween?.stop();
    this.pickupTween = undefined;
    this.sprite?.destroy();
    this.sprite = undefined;
    this.targetCoin = undefined;
    this.pickupCooldownLeft = 0;
    this.idleTime = 0;
  }
}
