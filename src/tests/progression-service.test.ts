import { describe, expect, it } from "vitest";
import { createDefaultSaveData, type SaveData } from "../game/state/SaveData";
import { ProgressionService } from "../game/systems/ProgressionService";

function saveWith(mutate: (save: SaveData) => void): SaveData {
  const save = createDefaultSaveData();
  mutate(save);
  return save;
}

describe("ProgressionService", () => {
  it("starts on level 1 with only level 1 unlocked", () => {
    const progression = new ProgressionService();
    expect(progression.currentLevelId).toBe(1);
    expect(progression.maxUnlockedLevelId).toBe(1);
    expect(progression.isUnlocked(1)).toBe(true);
    expect(progression.isUnlocked(2)).toBe(false);
    expect(progression.hasPreviousLevel()).toBe(false);
    expect(progression.hasNextLevel()).toBe(true);
  });

  it("marks a level cleared and unlocks the next as one operation", () => {
    const progression = new ProgressionService();
    const result = progression.clearLevelAndUnlockNext(1);

    expect(result.newlyUnlockedLevelId).toBe(2);
    expect(progression.isNormalCleared(1)).toBe(true);
    expect(progression.isUnlocked(2)).toBe(true);
    expect(progression.maxUnlockedLevelId).toBe(2);
  });

  it("does not report a new unlock when the next level was already unlocked", () => {
    const progression = new ProgressionService();
    progression.clearLevelAndUnlockNext(1);
    const again = progression.clearLevelAndUnlockNext(1);
    expect(again.newlyUnlockedLevelId).toBeUndefined();
    expect(progression.maxUnlockedLevelId).toBe(2);
  });

  it("only allows switching to unlocked levels", () => {
    const progression = new ProgressionService();
    expect(() => progression.setCurrentLevel(2)).toThrow();

    progression.clearLevelAndUnlockNext(1);
    progression.setCurrentLevel(2);
    expect(progression.currentLevelId).toBe(2);
    expect(progression.hasPreviousLevel()).toBe(true);

    progression.setCurrentLevel(1);
    expect(progression.currentLevelId).toBe(1);
  });

  it("clearing the final level does not unlock beyond the last configured level", () => {
    const progression = new ProgressionService();
    const last = progression.levelCount;
    const save = saveWith((data) => {
      data.player.maxUnlockedLevel = last;
      data.player.currentLevel = last;
      for (let id = 1; id <= last; id += 1) {
        const level = data.levels[id];
        if (level !== undefined) {
          level.unlocked = true;
        }
      }
    });
    const seeded = new ProgressionService(save);
    expect(seeded.hasNextLevel()).toBe(false);
    expect(seeded.clearLevelAndUnlockNext(last).newlyUnlockedLevelId).toBeUndefined();
    expect(seeded.maxUnlockedLevelId).toBe(last);
  });

  it("repairs prerequisite unlock state from a partial save", () => {
    const save = saveWith((data) => {
      data.player.maxUnlockedLevel = 3;
      data.player.currentLevel = 3;
    });
    const progression = new ProgressionService(save);
    expect(progression.isUnlocked(1)).toBe(true);
    expect(progression.isUnlocked(2)).toBe(true);
    expect(progression.isUnlocked(3)).toBe(true);
    expect(progression.currentLevelId).toBe(3);
  });

  it("falls back to a valid level when the saved current level is unknown", () => {
    const save = saveWith((data) => {
      data.player.currentLevel = 999;
      data.player.maxUnlockedLevel = 2;
    });
    const progression = new ProgressionService(save);
    expect(progression.currentLevelId).toBe(2);
  });
});
