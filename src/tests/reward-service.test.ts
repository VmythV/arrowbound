import { describe, expect, it } from "vitest";
import type { GameEventBus } from "../game/events/GameEventBus";
import type { PendingReward } from "../game/state/SaveData";
import { RewardService } from "../game/systems/RewardService";
import type { RandomService } from "../game/utils/random";

function fakeEvents(): GameEventBus {
  return { emit: () => true } as unknown as GameEventBus;
}

function fakeRandom(rolls: number[]): RandomService {
  let index = 0;
  return {
    next: () => rolls[index++] ?? 0,
    pick: <T>(values: readonly T[]): T => values[0] as T,
  } as unknown as RandomService;
}

const CHALLENGE_CONTEXT = {
  levelId: 1,
  clearCoinGoal: 100,
  freeUpgradeItems: ["precise_aim", "greedy_coin"] as const,
};

describe("RewardService.drawChallengeReward", () => {
  it("draws coins worth 20% of the goal on a low roll", () => {
    const service = new RewardService(fakeRandom([0.5]), fakeEvents());
    const reward = service.drawChallengeReward(CHALLENGE_CONTEXT);
    expect(reward.type).toBe("coins");
    expect(reward.amount).toBe(20);
    expect(reward.source).toBe("challenge");
  });

  it("draws a free upgrade on a mid roll when items are available", () => {
    const service = new RewardService(fakeRandom([0.8]), fakeEvents());
    const reward = service.drawChallengeReward(CHALLENGE_CONTEXT);
    expect(reward.type).toBe("shop_level");
    expect(reward.shopItemId).toBe("precise_aim");
  });

  it("falls back to coins when no free upgrade is available", () => {
    const service = new RewardService(fakeRandom([0.8]), fakeEvents());
    const reward = service.drawChallengeReward({ ...CHALLENGE_CONTEXT, freeUpgradeItems: [] });
    expect(reward.type).toBe("coins");
    expect(reward.amount).toBe(20);
  });

  it("draws an extra blessing choice on a high roll", () => {
    const service = new RewardService(fakeRandom([0.95]), fakeEvents());
    const reward = service.drawChallengeReward(CHALLENGE_CONTEXT);
    expect(reward.type).toBe("extra_blessing_choice");
  });

  it("draws a lucky first ten reward worth 10% of the goal", () => {
    const service = new RewardService(fakeRandom([]), fakeEvents());
    const reward = service.drawLuckyFirstTen(3, 380);
    expect(reward.type).toBe("coins");
    expect(reward.amount).toBe(38);
    expect(reward.source).toBe("lucky_first_ten");
  });
});

describe("RewardService queue", () => {
  function reward(id: string): PendingReward {
    return { id, source: "challenge", levelId: 1, type: "coins", amount: 10 };
  }

  it("queues rewards, grants once, and dequeues in order", () => {
    const service = new RewardService(fakeRandom([]), fakeEvents());
    service.enqueue(reward("a"));
    service.enqueue(reward("b"));
    expect(service.pending.map((entry) => entry.id)).toEqual(["a", "b"]);

    const granted: string[] = [];
    const first = service.claimNext((entry) => granted.push(entry.id));
    expect(first?.id).toBe("a");
    expect(granted).toEqual(["a"]);
    expect(service.pending.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("rejects duplicate queued ids", () => {
    const service = new RewardService(fakeRandom([]), fakeEvents());
    service.enqueue(reward("dup"));
    expect(() => service.enqueue(reward("dup"))).toThrow();
  });

  it("returns undefined when claiming an empty queue", () => {
    const service = new RewardService(fakeRandom([]), fakeEvents());
    expect(service.claimNext(() => undefined)).toBeUndefined();
  });
});
