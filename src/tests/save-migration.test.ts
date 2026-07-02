import { describe, expect, it } from "vitest";
import { CURRENT_SAVE_VERSION, createDefaultSaveData } from "../game/state/SaveData";
import { migrateAndNormalize } from "../game/save/save-migration";

describe("migrateAndNormalize", () => {
  it("returns a default save for non-object input", () => {
    expect(migrateAndNormalize(null)).toEqual(createDefaultSaveData());
    expect(migrateAndNormalize("broken")).toEqual(createDefaultSaveData());
    expect(migrateAndNormalize(42)).toEqual(createDefaultSaveData());
  });

  it("round-trips a valid save unchanged", () => {
    const save = createDefaultSaveData();
    save.player.coins = 123;
    save.shop.preciseAimLevel = 4;
    save.levels[1] = {
      unlocked: true,
      normalCleared: true,
      challengeCompleted: true,
      challengeChestClaimed: true,
      luckyFirstTenRewardClaimed: false,
      selectedBlessingId: "gold_bonus_30",
    };
    expect(migrateAndNormalize(structuredClone(save))).toEqual(save);
  });

  it("fills missing sections from defaults and stamps the current version", () => {
    const result = migrateAndNormalize({ player: { coins: 50 } });
    const base = createDefaultSaveData();
    expect(result.player.coins).toBe(50);
    expect(result.shop).toEqual(base.shop);
    expect(result.settings).toEqual(base.settings);
    expect(result.version).toBe(CURRENT_SAVE_VERSION);
  });

  it("repairs invalid numeric fields", () => {
    const result = migrateAndNormalize({
      player: { coins: -10, currentLevel: 2.9, maxUnlockedLevel: -5 },
      shop: { preciseAimLevel: "oops", greedyCoinLevel: 3.7 },
      stats: { totalShots: -1, totalHits: 2.5 },
    });
    expect(result.player.coins).toBe(0);
    expect(result.player.currentLevel).toBe(2);
    expect(result.player.maxUnlockedLevel).toBe(1);
    expect(result.shop.preciseAimLevel).toBe(0);
    expect(result.shop.greedyCoinLevel).toBe(3);
    expect(result.stats.totalShots).toBe(0);
    expect(result.stats.totalHits).toBe(2);
  });

  it("keeps only well-formed pending rewards and ignores unknown fields", () => {
    const result = migrateAndNormalize({
      rewards: {
        pendingExtraBlessingChoices: 2,
        pendingRewards: [
          { id: "a", source: "challenge", levelId: 1, type: "coins", amount: 20 },
          { id: "b", source: "bogus", levelId: 1, type: "coins" },
          { source: "challenge", levelId: 1, type: "coins" },
          "not-an-object",
        ],
      },
      unknownField: { nested: true },
    });
    expect(result.rewards.pendingExtraBlessingChoices).toBe(2);
    expect(result.rewards.pendingRewards).toEqual([
      { id: "a", source: "challenge", levelId: 1, type: "coins", amount: 20 },
    ]);
    expect(result).not.toHaveProperty("unknownField");
  });

  it("coerces level flags to booleans", () => {
    const result = migrateAndNormalize({
      levels: { 1: { unlocked: "yes", normalCleared: 1, challengeChestClaimed: true } },
    });
    expect(result.levels[1]).toMatchObject({
      unlocked: false,
      normalCleared: false,
      challengeChestClaimed: true,
    });
  });
});
