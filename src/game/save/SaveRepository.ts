import type { SaveData } from "../state/SaveData";

/**
 * 存档读写抽象。localStorage 只是首个实现；持久化一律走此接口。
 */
export interface SaveRepository {
  /** 读取并规整存档；无存档或损坏时返回可用的默认存档。 */
  load(): SaveData;
  /** 写入存档。 */
  save(data: SaveData): void;
  /** 清除存档。 */
  clear(): void;
}
