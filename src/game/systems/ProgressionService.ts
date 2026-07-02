import { MAX_LEVEL_ID } from "../config/game.constants";
import { getLevelConfig, type LevelConfig } from "../config/level.config";
import { createDefaultSaveData, type LevelSaveData, type SaveData } from "../state/SaveData";

export type LevelUnlockResult = {
  /** 本次通关新解锁的关卡 id；已达 `MAX_LEVEL_ID` 或已解锁时为 undefined。 */
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
 * 关卡近似无限：前 10 关手工配置，第 11 关起按 `getLevelConfig` 公式生成；
 * 关卡存档条目按需惰性创建，只有玩家到达过的关卡才写入 `levels`。
 * 普通通关只能经过 `clearLevelAndUnlockNext`，切换关卡只能经过 `setCurrentLevel`。
 */
export class ProgressionService {
  private currentId: number;
  private maxUnlockedId: number;
  private readonly levels = new Map<number, LevelSaveData>();

  constructor(save: SaveData = createDefaultSaveData()) {
    // 仅采纳存档中合法 id 的关卡条目，其余关卡按需惰性生成默认值。
    for (const [idText, stored] of Object.entries(save.levels)) {
      const id = Number(idText);
      if (isValidLevelId(id) && stored !== undefined) {
        this.levels.set(id, { ...stored });
      }
    }

    // 已解锁上限取存档字段与实际已解锁关卡的较高者，并限制到关卡上限。
    let maxUnlocked = Math.max(1, Math.floor(save.player.maxUnlockedLevel));
    for (const [id, data] of this.levels) {
      if (data.unlocked) {
        maxUnlocked = Math.max(maxUnlocked, id);
      }
    }
    this.maxUnlockedId = Math.min(maxUnlocked, MAX_LEVEL_ID);

    // 修复前置关卡的解锁状态，保证 1..maxUnlocked 均已解锁。
    for (let id = 1; id <= this.maxUnlockedId; id += 1) {
      this.ensureLevel(id).unlocked = true;
    }

    // 当前关卡非法或尚未解锁时，回退到最高有效已解锁关卡。
    this.currentId = isValidLevelId(save.player.currentLevel) ? save.player.currentLevel : this.maxUnlockedId;
    if (!this.isUnlocked(this.currentId)) {
      this.currentId = this.maxUnlockedId;
    }
  }

  /** 关卡数量上限（近似无限）。 */
  get maxLevelId(): number {
    return MAX_LEVEL_ID;
  }

  get currentLevelId(): number {
    return this.currentId;
  }

  /**
   * 导出进度相关的存档片段：当前关、已解锁上限与已到达关卡的状态。
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
    const config = getLevelConfig(this.currentId);
    if (config === undefined) {
      throw new Error(`Missing configuration for level ${this.currentId}`);
    }
    return config;
  }

  getConfig(levelId: number): LevelConfig | undefined {
    return getLevelConfig(levelId);
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
    const data = this.ensureLevel(levelId);
    data.challengeCompleted = true;
    if (chestClaimed) {
      data.challengeChestClaimed = true;
    }
  }

  isLuckyFirstTenClaimed(levelId: number): boolean {
    return this.levels.get(levelId)?.luckyFirstTenRewardClaimed ?? false;
  }

  markLuckyFirstTenClaimed(levelId: number): void {
    this.ensureLevel(levelId).luckyFirstTenRewardClaimed = true;
  }

  getSelectedBlessingId(levelId: number): string | undefined {
    return this.levels.get(levelId)?.selectedBlessingId;
  }

  setSelectedBlessingId(levelId: number, blessingId: string): void {
    this.ensureLevel(levelId).selectedBlessingId = blessingId;
  }

  hasNextLevel(): boolean {
    return this.currentId < MAX_LEVEL_ID;
  }

  hasPreviousLevel(): boolean {
    return this.currentId > 1;
  }

  setCurrentLevel(levelId: number): void {
    if (!isValidLevelId(levelId)) {
      throw new Error(`Cannot switch to unknown level ${levelId}`);
    }
    if (!this.isUnlocked(levelId)) {
      throw new Error(`Cannot switch to locked level ${levelId}`);
    }
    this.currentId = levelId;
  }

  /**
   * 原子地标记指定关卡普通通关并解锁下一关。调用方需已完成扣费校验；
   * 已通关的关卡再次调用不重复解锁，返回 undefined；已达 `MAX_LEVEL_ID` 时不再解锁。
   */
  clearLevelAndUnlockNext(levelId: number): LevelUnlockResult {
    const data = this.ensureLevel(levelId);
    data.normalCleared = true;

    const nextId = levelId + 1;
    if (nextId > MAX_LEVEL_ID) {
      return {};
    }
    const nextData = this.ensureLevel(nextId);
    const nextWasLocked = !nextData.unlocked;
    nextData.unlocked = true;
    this.maxUnlockedId = Math.max(this.maxUnlockedId, nextId);
    return nextWasLocked ? { newlyUnlockedLevelId: nextId } : {};
  }

  /** 获取关卡存档条目，缺失时按需创建默认（锁定）条目。 */
  private ensureLevel(levelId: number, unlocked = false): LevelSaveData {
    if (!isValidLevelId(levelId)) {
      throw new Error(`Cannot access invalid level ${levelId}`);
    }
    let data = this.levels.get(levelId);
    if (data === undefined) {
      data = defaultLevelSave(unlocked);
      this.levels.set(levelId, data);
    }
    return data;
  }
}

function isValidLevelId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= MAX_LEVEL_ID;
}
