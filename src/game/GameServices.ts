import { GameEventBus } from "./events/GameEventBus";
import { StateController } from "./state/StateController";
import { GameClock } from "./systems/GameClock";
import { RandomService } from "./utils/random";

export const GAME_SERVICES_REGISTRY_KEY = "arrowbound:services";

export type GameServices = {
  readonly events: GameEventBus;
  readonly state: StateController;
  readonly clock: GameClock;
  readonly random: RandomService;
};

export function createGameServices(): GameServices {
  const events = new GameEventBus();
  return {
    events,
    state: new StateController(events),
    clock: new GameClock(),
    random: new RandomService(),
  };
}

export function getGameServices(registry: Phaser.Data.DataManager): GameServices {
  const services = registry.get(GAME_SERVICES_REGISTRY_KEY) as GameServices | undefined;
  if (services === undefined) {
    throw new Error("Game services have not been initialized");
  }
  return services;
}
