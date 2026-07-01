import { describe, expect, it } from "vitest";
import type { GameEventBus } from "../game/events/GameEventBus";
import { createDefaultSaveData, type PendingReward } from "../game/state/SaveData";
import { RewardSystem } from "../game/systems/RewardSystem";

function createEventSink(log: string[]): GameEventBus {
  return {
    emit: (event: string) => {
      log.push(event);
      return true;
    },
  } as unknown as GameEventBus;
}

describe("RewardSystem", () => {
  it("persists a queued reward before announcing it", async () => {
    const log: string[] = [];
    const system = new RewardSystem(
      createDefaultSaveData(),
      async () => {
        log.push("persisted");
      },
      createEventSink(log),
    );
    const reward: PendingReward = {
      id: "reward-1",
      source: "challenge",
      levelId: 1,
      type: "coins",
      amount: 20,
    };

    await system.queue(reward);
    expect(log[0]).toBe("persisted");
    expect(system.nextReward).toEqual(reward);
    expect(log).toContain("reward:queued");
  });

  it("applies and removes a reward in one persisted draft", async () => {
    let persistedCoins = 0;
    let persistedQueueLength = -1;
    const system = new RewardSystem(
      createDefaultSaveData(),
      (save) => {
        persistedCoins = save.player.coins;
        persistedQueueLength = save.rewards.pendingRewards.length;
      },
      createEventSink([]),
    );
    await system.queue({
      id: "reward-2",
      source: "lucky_first_ten",
      levelId: 1,
      type: "coins",
      amount: 10,
    });

    await system.claimNext((draft, reward) => {
      draft.player.coins += reward.amount ?? 0;
    });
    expect(persistedCoins).toBe(10);
    expect(persistedQueueLength).toBe(0);
    expect(system.nextReward).toBeUndefined();
  });
});
