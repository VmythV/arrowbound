import { LEVEL_CONFIGS, type LevelConfig } from "../config/level.config";
import { createDefaultSaveData, type LevelSaveData, type SaveData } from "../state/SaveData";

export type LevelUnlockResult = {
  /** 本次通关新解锁的关卡 id；已是最后一关或已解锁时为 undefined。 */
  readonly newlyUnlockedLevelId?: number;
};

function defaultLevelSave(unlocked: boolean): LevelSaveData {
  return {
    unlocked,
    normalCleared: false,
    challengeCompleted: false,
    challengeChestClaimed: false,
    luckyFirstTenRewardClaimed: false,
  };
}

/**
 * 关卡进度的内存态真相源：当前关、已解锁上限与每关通关/祝福状态。
 * 首版不做持久化，阶段 11 接入 SaveRepository 后由外部注入初始存档并订阅变更保存。
 * 普通通关只能经过 `clearLevelAndUnlockNext`，切换关卡只能经过 `setCurrentLevel`。
 */
export class ProgressionService {
  private currentId: number;
  private maxUnlockedId: number;
  private readonly levels = new Map<number, LevelSaveData>();
  private readonly configs = new Map<number, LevelConfig>();

  constructor(save: SaveData = createDefaultSaveData()) {
    for (const config of LEVEL_CONFIGS) {
      this.configs.set(config.id, config);
      const stored = save.levels[config.id];
      this.levels.set(config.id, stored === undefined ? defaultLevelSave(config.id === 1) : { ...stored });
    }

    // 已解锁上限取存档字段与实际已解锁关卡的较高者，避免解锁状态冲突。
    let maxUnlocked = Math.max(1, Math.floor(save.player.maxUnlockedLevel));
    for (const config of LEVEL_CONFIGS) {
      if (this.levels.get(config.id)?.unlocked === true) {
        maxUnlocked = Math.max(maxUnlocked, config.id);
      }
    }
    this.maxUnlockedId = Math.min(maxUnlocked, this.levelCount);

    // 修复前置关卡的解锁状态，保证 1..maxUnlocked 均已解锁。
    for (const config of LEVEL_CONFIGS) {
      if (config.id <= this.maxUnlockedId) {
        const data = this.levels.get(config.id);
        if (data !== undefined) {
          data.unlocked = true;
        }
      }
    }

    // 当前关卡未知或尚未解锁时，回退到最高有效已解锁关卡。
    this.currentId = this.configs.has(save.player.currentLevel) ? save.player.currentLevel : this.maxUnlockedId;
    if (!this.isUnlocked(this.currentId)) {
      this.currentId = this.maxUnlockedId;
    }
  }

  get levelCount(): number {
    return LEVEL_CONFIGS.length;
  }

  get currentLevelId(): number {
    return this.currentId;
  }

  /**
   * 导出进度相关的存档片段：当前关、已解锁上限与每关状态。
   */
  toSaveData(): { currentLevel: number; maxUnlockedLevel: number; levels: Record<number, LevelSaveData> } {
    const levels: Record<number, LevelSaveData> = {};
    for (const [id, data] of this.levels) {
      levels[id] = { ...data };
    }
    return { currentLevel: this.currentId, maxUnlockedLevel: this.maxUnlockedId, levels };
  }

  get maxUnlockedLevelId(): number {
    return this.maxUnlockedId;
  }

  get currentConfig(): LevelConfig {
    const config = this.configs.get(this.currentId);
    if (config === undefined) {
      throw new Error(`Missing configuration for level ${this.currentId}`);
    }
    return config;
  }

  getConfig(levelId: number): LevelConfig | undefined {
    return this.configs.get(levelId);
  }

  isUnlocked(levelId: number): boolean {
    return this.levels.get(levelId)?.unlocked ?? false;
  }

  isNormalCleared(levelId: number): boolean {
    return this.levels.get(levelId)?.normalCleared ?? false;
  }

  isChallengeChestClaimed(levelId: number): boolean {
    return this.levels.get(levelId)?.challengeChestClaimed ?? false;
  }

  markChallengeCompleted(levelId: number, chestClaimed: boolean): void {
    const data = this.levels.get(levelId);
    if (data === undefined) {
      throw new Error(`Cannot mark challenge for unknown level ${levelId}`);
    }
    data.challengeCompleted = true;
    if (chestClaimed) {
      data.challengeChestClaimed = true;
    }
  }

  isLuckyFirstTenClaimed(levelId: number): boolean {
    return this.levels.get(levelId)?.luckyFirstTenRewardClaimed ?? false;
  }

  markLuckyFirstTenClaimed(levelId: number): void {
    const data = this.levels.get(levelId);
    if (data === undefined) {
      throw new Error(`Cannot mark lucky first ten for unknown level ${levelId}`);
    }
    data.luckyFirstTenRewardClaimed = true;
  }

  getSelectedBlessingId(levelId: number): string | undefined {
    return this.levels.get(levelId)?.selectedBlessingId;
  }

  setSelectedBlessingId(levelId: number, blessingId: string): void {
    const data = this.levels.get(levelId);
    if (data === undefined) {
      throw new Error(`Cannot set blessing for unknown level ${levelId}`);
    }
    data.selectedBlessingId = blessingId;
  }

  hasNextLevel(): boolean {
    return this.currentId < this.levelCount;
  }

  hasPreviousLevel(): boolean {
    return this.currentId > 1;
  }

  setCurrentLevel(levelId: number): void {
    if (!this.configs.has(levelId)) {
      throw new Error(`Cannot switch to unknown level ${levelId}`);
    }
    if (!this.isUnlocked(levelId)) {
      throw new Error(`Cannot switch to locked level ${levelId}`);
    }
    this.currentId = levelId;
  }

  /**
   * 原子地标记指定关卡普通通关并解锁下一关。调用方需已完成扣费校验；
   * 已通关的关卡再次调用不重复解锁，返回 undefined。
   */
  clearLevelAndUnlockNext(levelId: number): LevelUnlockResult {
    const data = this.levels.get(levelId);
    if (data === undefined) {
      throw new Error(`Cannot clear unknown level ${levelId}`);
    }
    data.normalCleared = true;

    const nextId = levelId + 1;
    const nextData = this.levels.get(nextId);
    if (nextData === undefined) {
      return {};
    }
    const nextWasLocked = !nextData.unlocked;
    nextData.unlocked = true;
    this.maxUnlockedId = Math.max(this.maxUnlockedId, nextId);
    return nextWasLocked ? { newlyUnlockedLevelId: nextId } : {};
  }
}
