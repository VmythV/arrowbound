import { GameEventBus } from "./events/GameEventBus";
import { StateController } from "./state/StateController";
import { BlessingService } from "./systems/BlessingService";
import { CoinLedger } from "./systems/CoinLedger";
import { GameClock } from "./systems/GameClock";
import { ProgressionService } from "./systems/ProgressionService";
import { RewardService } from "./systems/RewardService";
import { ShopService } from "./systems/ShopService";
import { RandomService } from "./utils/random";

export const GAME_SERVICES_REGISTRY_KEY = "arrowbound:services";

export type GameServices = {
  readonly events: GameEventBus;
  readonly state: StateController;
  readonly clock: GameClock;
  readonly random: RandomService;
  readonly ledger: CoinLedger;
  readonly progression: ProgressionService;
  readonly shop: ShopService;
  readonly blessings: BlessingService;
  readonly rewards: RewardService;
};

export function createGameServices(): GameServices {
  const events = new GameEventBus();
  const state = new StateController(events);
  const random = new RandomService();
  return {
    events,
    state,
    clock: new GameClock(),
    random,
    ledger: new CoinLedger(events, state),
    progression: new ProgressionService(),
    shop: new ShopService(),
    blessings: new BlessingService(random),
    rewards: new RewardService(random, events),
  };
}

export function getGameServices(registry: Phaser.Data.DataManager): GameServices {
  const services = registry.get(GAME_SERVICES_REGISTRY_KEY) as GameServices | undefined;
  if (services === undefined) {
    throw new Error("Game services have not been initialized");
  }
  return services;
}
