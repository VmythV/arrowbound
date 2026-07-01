import type { GameEventBus } from "../events/GameEventBus";
import type { PendingReward, SaveData } from "../state/SaveData";

export type ImmediateSave = (save: Readonly<SaveData>) => void | Promise<void>;
export type RewardGrant = (draft: SaveData, reward: PendingReward) => void;

export class RewardSystem {
  private saveData: SaveData;

  constructor(
    initialSave: SaveData,
    private readonly saveImmediately: ImmediateSave,
    private readonly events: GameEventBus,
  ) {
    this.saveData = structuredClone(initialSave);
  }

  get save(): Readonly<SaveData> {
    return structuredClone(this.saveData);
  }

  get nextReward(): PendingReward | undefined {
    return this.saveData.rewards.pendingRewards[0];
  }

  async queue(reward: PendingReward): Promise<void> {
    if (this.saveData.rewards.pendingRewards.some((pending) => pending.id === reward.id)) {
      throw new Error(`Reward ${reward.id} is already queued`);
    }

    const draft = structuredClone(this.saveData);
    draft.rewards.pendingRewards.push(reward);
    await this.saveImmediately(draft);
    this.saveData = draft;
    this.events.emit("reward:queued", { reward });
    this.events.emit("save:changed", { save: this.save });
  }

  async claimNext(grant: RewardGrant): Promise<PendingReward | undefined> {
    const reward = this.nextReward;
    if (reward === undefined) {
      return undefined;
    }

    const draft = structuredClone(this.saveData);
    const queuedReward = draft.rewards.pendingRewards[0];
    if (queuedReward === undefined || queuedReward.id !== reward.id) {
      throw new Error("Reward queue changed during claim");
    }

    grant(draft, queuedReward);
    draft.rewards.pendingRewards.shift();
    await this.saveImmediately(draft);
    this.saveData = draft;
    this.events.emit("save:changed", { save: this.save });
    return reward;
  }
}
