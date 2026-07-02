import { GameEventBus } from "./events/GameEventBus";
import { LocalStorageSaveRepository } from "./save/LocalStorageSaveRepository";
import type { SaveRepository } from "./save/SaveRepository";
import { SaveService } from "./save/SaveService";
import { createDefaultSaveData, type SaveData } from "./state/SaveData";
import { StateController } from "./state/StateController";
import { BlessingService } from "./systems/BlessingService";
import { CoinLedger } from "./systems/CoinLedger";
import { GameClock } from "./systems/GameClock";
import { ProgressionService } from "./systems/ProgressionService";
import { RewardService } from "./systems/RewardService";
import { SettingsService } from "./systems/SettingsService";
import { ShopService } from "./systems/ShopService";
import { StatsService } from "./systems/StatsService";
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
  readonly settings: SettingsService;
  readonly stats: StatsService;
  readonly repository: SaveRepository;
  readonly saveService: SaveService;
};

export function createGameServices(
  initialSave: SaveData = createDefaultSaveData(),
  repository: SaveRepository = new LocalStorageSaveRepository(),
): GameServices {
  const events = new GameEventBus();
  const state = new StateController(events);
  const random = new RandomService();
  const clock = new GameClock();
  const ledger = new CoinLedger(
    events,
    state,
    initialSave.player.coins,
    initialSave.stats.totalCoinsEarned,
  );
  const progression = new ProgressionService(initialSave);
  const shop = new ShopService(initialSave.shop);
  const blessings = new BlessingService(random, initialSave.rewards.pendingExtraBlessingChoices);
  const rewards = new RewardService(random, events, initialSave.rewards.pendingRewards);
  const settings = new SettingsService(initialSave.settings);
  const stats = new StatsService(events, initialSave.stats);
  const saveService = new SaveService({
    events,
    clock,
    repository,
    ledger,
    progression,
    shop,
    blessings,
    rewards,
    settings,
    stats,
  });

  return {
    events,
    state,
    clock,
    random,
    ledger,
    progression,
    shop,
    blessings,
    rewards,
    settings,
    stats,
    repository,
    saveService,
  };
}

export function getGameServices(registry: Phaser.Data.DataManager): GameServices {
  const services = registry.get(GAME_SERVICES_REGISTRY_KEY) as GameServices | undefined;
  if (services === undefined) {
    throw new Error("Game services have not been initialized");
  }
  return services;
}
