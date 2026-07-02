import * as Phaser from "phaser";
import type { PendingReward, SaveData } from "../state/SaveData";
import type { GamePhase, ModalType, RuntimeState } from "../state/RuntimeState";
import type { ProjectileResolution } from "../systems/ProjectileSystem";
import type { CoinSource } from "../systems/coin-income";
import type { ShopItemId } from "../config/shop.config";
import type { Point } from "../utils/ballistics";

export type GameEventMap = {
  "assets:progress": { progress: number };
  "game:ready": { levelId: number };
  "shot:fired": { angle: number };
  "arrow:resolved": ProjectileResolution;
  "coin:collected": { value: number; coins: number; source: CoinSource; point?: Point };
  "wallet:changed": { coins: number; delta: number; reason: "collect" | "spend" | "reward" };
  "level:changed": { levelId: number; normalCleared: boolean; clearCoinGoal: number };
  "intent:go-next-level": Record<string, never>;
  "intent:go-previous-level": Record<string, never>;
  "intent:open-shop": Record<string, never>;
  "intent:open-settings": Record<string, never>;
  "intent:reset-save": Record<string, never>;
  "intent:close-modal": Record<string, never>;
  "intent:purchase-shop-item": { itemId: ShopItemId };
  "shop:changed": Record<string, never>;
  "shop:purchased": { itemId: ShopItemId; level: number; newlyUnlocked: readonly ShopItemId[] };
  "shop:purchase-failed": { itemId: ShopItemId; reason: "locked" | "maxed" | "insufficient" };
  "blessing:offer": { levelId: number; candidateIds: readonly string[]; usedExtraChoice: boolean };
  "blessing:selected": { levelId: number; blessingId: string };
  "intent:select-blessing": { blessingId: string };
  "intent:start-challenge": Record<string, never>;
  "intent:claim-reward": Record<string, never>;
  "challenge:started": { timeLeft: number; target: number };
  "challenge:ended": { success: boolean; score: number; target: number };
  "reward:show": { reward: PendingReward };
  "reward:done": Record<string, never>;
  "phase:changed": { previous: GamePhase; current: GamePhase; state: Readonly<RuntimeState> };
  "modal:changed": { modal: ModalType; state: Readonly<RuntimeState> };
  "state:changed": { state: Readonly<RuntimeState> };
  "save:changed": { save: Readonly<SaveData> };
  "reward:queued": { reward: PendingReward };
};

type GameEventName = keyof GameEventMap;
type GameEventListener<K extends GameEventName> = (payload: GameEventMap[K]) => void;

export class GameEventBus {
  private readonly emitter = new Phaser.Events.EventEmitter();

  on<K extends GameEventName>(event: K, listener: GameEventListener<K>, context?: object): this {
    this.emitter.on(event, listener, context);
    return this;
  }

  once<K extends GameEventName>(event: K, listener: GameEventListener<K>, context?: object): this {
    this.emitter.once(event, listener, context);
    return this;
  }

  off<K extends GameEventName>(event: K, listener: GameEventListener<K>, context?: object): this {
    this.emitter.off(event, listener, context);
    return this;
  }

  emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): boolean {
    return this.emitter.emit(event, payload);
  }

  destroy(): void {
    this.emitter.destroy();
  }
}
