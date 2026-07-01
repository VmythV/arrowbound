import * as Phaser from "phaser";
import type { PendingReward, SaveData } from "../state/SaveData";
import type { GamePhase, ModalType, RuntimeState } from "../state/RuntimeState";
import type { ProjectileResolution } from "../systems/ProjectileSystem";
import type { CoinSource } from "../systems/coin-income";
import type { Point } from "../utils/ballistics";

export type GameEventMap = {
  "assets:progress": { progress: number };
  "game:ready": { levelId: number };
  "shot:fired": { angle: number };
  "arrow:resolved": ProjectileResolution;
  "coin:collected": { value: number; coins: number; source: CoinSource; point?: Point };
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
