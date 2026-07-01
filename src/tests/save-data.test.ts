import { describe, expect, it } from "vitest";
import { LEVEL_CONFIGS } from "../game/config/level.config";
import { createDefaultSaveData, CURRENT_SAVE_VERSION } from "../game/state/SaveData";

describe("default save", () => {
  it("starts at level one with all documented fields", () => {
    const save = createDefaultSaveData();
    expect(save.version).toBe(CURRENT_SAVE_VERSION);
    expect(save.player).toEqual({ coins: 0, currentLevel: 1, maxUnlockedLevel: 1 });
    expect(Object.keys(save.levels)).toHaveLength(LEVEL_CONFIGS.length);
    expect(save.levels[1]?.unlocked).toBe(true);
    expect(save.levels[2]?.unlocked).toBe(false);
    expect(save.rewards.pendingRewards).toEqual([]);
    expect(save.settings).toEqual({
      masterVolume: 0.8,
      musicVolume: 0.6,
      sfxVolume: 0.8,
      muted: false,
    });
  });
});
