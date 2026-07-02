import { createDefaultSaveData, type SaveData } from "../state/SaveData";
import { migrateAndNormalize } from "./save-migration";
import type { SaveRepository } from "./SaveRepository";

export const SAVE_KEY = "arrowbound_save";
export const CORRUPT_BACKUP_KEY = "arrowbound_save_corrupt";

/**
 * 基于 localStorage 的存档实现。解析失败时把原始损坏字符串备份到备用 key，再返回默认存档，
 * 保证损坏存档不会导致白屏或无法开始游戏；存储不可用时静默回退到默认存档。
 */
export class LocalStorageSaveRepository implements SaveRepository {
  constructor(private readonly storage: Storage = globalThis.localStorage) {}

  load(): SaveData {
    let raw: string | null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch {
      return createDefaultSaveData();
    }
    if (raw === null) {
      return createDefaultSaveData();
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.backupCorrupt(raw);
      return createDefaultSaveData();
    }
    return migrateAndNormalize(parsed);
  }

  save(data: SaveData): void {
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // 存储不可用（隐私模式/配额）时忽略，避免打断游戏。
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(SAVE_KEY);
    } catch {
      // 忽略清除失败。
    }
  }

  private backupCorrupt(raw: string): void {
    try {
      this.storage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // 备份失败不影响回退到默认存档。
    }
  }
}
