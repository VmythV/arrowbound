/** 需清过第 15 关才解锁转生。 */
export const PRESTIGE_UNLOCK_LEVEL = 15;
/** 每点星尘为全局金币收益提供的永久加成。 */
const STARDUST_BONUS_RATE = 0.05;
/** 星尘随本轮最高通关关卡超线性增长。 */
const STARDUST_EXPONENT = 1.5;

export type PrestigeSaveData = {
  stardust: number;
  count: number;
};

/**
 * 按本轮已通关的最高关卡计算可获得的星尘：清到解锁关之前为 0，之后按超线性增长，
 * 使每次转生都能走得更远、拿到更多星尘，形成真正无限的复利外循环。
 */
export function stardustFor(highestClearedLevel: number): number {
  const over = Math.floor(highestClearedLevel) - (PRESTIGE_UNLOCK_LEVEL - 1);
  if (over <= 0) {
    return 0;
  }
  return Math.floor(over ** STARDUST_EXPONENT);
}

/**
 * 局外永久成长（转生）。持有累计星尘与转生次数，提供作用于全局金币的永久倍率。
 * 转生动作本身（重置进度、保留星尘）由场景编排：写入保留星尘的新存档后刷新页面。
 */
export class PrestigeService {
  private _stardust: number;
  private _count: number;

  constructor(save: PrestigeSaveData = { stardust: 0, count: 0 }) {
    this._stardust = Math.max(0, Math.floor(save.stardust));
    this._count = Math.max(0, Math.floor(save.count));
  }

  get stardust(): number {
    return this._stardust;
  }

  get count(): number {
    return this._count;
  }

  /** 全局金币永久倍率：`1 + 星尘 × 0.05`，同时作用于手动与机器人收益。 */
  multiplier(): number {
    return 1 + this._stardust * STARDUST_BONUS_RATE;
  }

  /** 以当前进度立即转生可获得的星尘。 */
  pendingStardust(highestClearedLevel: number): number {
    return stardustFor(highestClearedLevel);
  }

  canPrestige(highestClearedLevel: number): boolean {
    return this.pendingStardust(highestClearedLevel) > 0;
  }

  toSaveData(): PrestigeSaveData {
    return { stardust: this._stardust, count: this._count };
  }
}
