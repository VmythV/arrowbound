import { describe, expect, it } from "vitest";
import { createDefaultSaveData, CURRENT_SAVE_VERSION } from "../game/state/SaveData";

describe("default save", () => {
  it("starts at level one with all documented fields", () => {
    const save = createDefaultSaveData();
    expect(save.version).toBe(CURRENT_SAVE_VERSION);
    expect(save.player).toEqual({ coins: 0, currentLevel: 1, maxUnlockedLevel: 1 });
    // 关卡近似无限：默认存档只种下第 1 关，其余关卡到达时惰性创建。
    expect(Object.keys(save.levels)).toHaveLength(1);
    expect(save.levels[1]?.unlocked).toBe(true);
    expect(save.levels[2]).toBeUndefined();
    expect(save.rewards.pendingRewards).toEqual([]);
    expect(save.settings).toEqual({
      masterVolume: 0.8,
      musicVolume: 0.6,
      sfxVolume: 0.8,
      muted: false,
    });
  });
});
