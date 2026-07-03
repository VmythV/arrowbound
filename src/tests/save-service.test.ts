import { describe, expect, it } from "vitest";
import type { GameEventBus } from "../game/events/GameEventBus";
import type { SaveData } from "../game/state/SaveData";
import { createDefaultSaveData } from "../game/state/SaveData";
import type { SaveRepository } from "../game/save/SaveRepository";
import { SaveService } from "../game/save/SaveService";
import { BlessingService } from "../game/systems/BlessingService";
import { CoinLedger, type ChallengeScoring } from "../game/systems/CoinLedger";
import { GameClock } from "../game/systems/GameClock";
import { PrestigeService } from "../game/systems/PrestigeService";
import { ProgressionService } from "../game/systems/ProgressionService";
import { RewardService } from "../game/systems/RewardService";
import { SettingsService } from "../game/systems/SettingsService";
import { ShopService } from "../game/systems/ShopService";
import { StatsService } from "../game/systems/StatsService";
import { RandomService } from "../game/utils/random";

function fakeEvents(): GameEventBus {
  return { on: () => undefined, off: () => undefined, emit: () => true } as unknown as GameEventBus;
}

const IDLE_CHALLENGE: ChallengeScoring = {
  snapshot: { isChallengeActive: false },
  addChallengeScore: () => undefined,
};

function buildServices(save: SaveData) {
  const events = fakeEvents();
  const random = new RandomService(7);
  return {
    ledger: new CoinLedger(events, IDLE_CHALLENGE, save.player.coins, save.stats.totalCoinsEarned),
    progression: new ProgressionService(save),
    prestige: new PrestigeService(save.prestige),
    shop: new ShopService(save.shop),
    blessings: new BlessingService(random, save.rewards.pendingExtraBlessingChoices),
    rewards: new RewardService(random, events, save.rewards.pendingRewards),
    settings: new SettingsService(save.settings),
    stats: new StatsService(events, save.stats),
    events,
  };
}

describe("SaveService round-trip", () => {
  it("captures and restores full progress across a reload", () => {
    const initial = createDefaultSaveData();
    initial.stats.totalShots = 7;
    const services = buildServices(initial);
    let captured: SaveData | undefined;
    const repository: SaveRepository = {
      load: () => captured ?? createDefaultSaveData(),
      save: (data) => {
        captured = data;
      },
      clear: () => {
        captured = undefined;
      },
    };
    const saveService = new SaveService({
      events: services.events,
      clock: new GameClock(),
      repository,
      ledger: services.ledger,
      progression: services.progression,
      prestige: services.prestige,
      shop: services.shop,
      blessings: services.blessings,
      rewards: services.rewards,
      settings: services.settings,
      stats: services.stats,
    });

    // 模拟一局进度变化。
    const unlockContext = { isNormalCleared: () => false };
    services.ledger.grantReward(150);
    services.shop.grantLevel("precise_aim", unlockContext);
    services.shop.grantLevel("precise_aim", unlockContext);
    services.progression.clearLevelAndUnlockNext(1);
    services.progression.setCurrentLevel(2);
    services.progression.setSelectedBlessingId(1, "gold_bonus_30");
    services.blessings.grantExtraChoice();
    services.rewards.enqueue({ id: "r1", source: "challenge", levelId: 2, type: "coins", amount: 40 });

    saveService.saveNow();
    const snapshot = captured;
    expect(snapshot).toBeDefined();
    if (snapshot === undefined) {
      return;
    }

    // 从快照重建服务，等价于刷新后恢复。
    const restored = buildServices(snapshot);
    expect(restored.ledger.coins).toBe(150);
    expect(restored.ledger.totalCoinsEarned).toBe(150);
    expect(restored.shop.getLevel("precise_aim")).toBe(2);
    expect(restored.progression.currentLevelId).toBe(2);
    expect(restored.progression.isNormalCleared(1)).toBe(true);
    expect(restored.progression.isUnlocked(2)).toBe(true);
    expect(restored.progression.getSelectedBlessingId(1)).toBe("gold_bonus_30");
    expect(restored.blessings.pendingExtraChoices).toBe(1);
    expect(restored.rewards.pending.map((reward) => reward.id)).toEqual(["r1"]);
    expect(snapshot.stats.totalShots).toBe(7);
  });
});
