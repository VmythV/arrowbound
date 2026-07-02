import { GameEventBus } from "./events/GameEventBus";
import { StateController } from "./state/StateController";
import { CoinLedger } from "./systems/CoinLedger";
import { GameClock } from "./systems/GameClock";
import { ProgressionService } from "./systems/ProgressionService";
import { RandomService } from "./utils/random";

export const GAME_SERVICES_REGISTRY_KEY = "arrowbound:services";

export type GameServices = {
  readonly events: GameEventBus;
  readonly state: StateController;
  readonly clock: GameClock;
  readonly random: RandomService;
  readonly ledger: CoinLedger;
  readonly progression: ProgressionService;
};

export function createGameServices(): GameServices {
  const events = new GameEventBus();
  const state = new StateController(events);
  return {
    events,
    state,
    clock: new GameClock(),
    random: new RandomService(),
    ledger: new CoinLedger(events, state),
    progression: new ProgressionService(),
  };
}

export function getGameServices(registry: Phaser.Data.DataManager): GameServices {
  const services = registry.get(GAME_SERVICES_REGISTRY_KEY) as GameServices | undefined;
  if (services === undefined) {
    throw new Error("Game services have not been initialized");
  }
  return services;
}
