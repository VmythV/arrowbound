import { CHALLENGE_DURATION_SECONDS } from "../config/game.constants";

export type GamePhase =
  | "boot"
  | "blessing_select"
  | "playing"
  | "challenge"
  | "reward"
  | "level_transition";

export type ModalType = "shop" | "settings" | null;
export type PauseReason = "shop" | "blessing" | "chest" | "settings" | "visibility";

export type RuntimeState = {
  phase: GamePhase;
  activeModal: ModalType;
  currentLevelId: number;
  currentBlessingId?: string;
  isGameplayPaused: boolean;
  pauseReason?: PauseReason;
  isChallengeActive: boolean;
  challengeRunId?: string;
  challengeTimeLeft: number;
  challengeCoinsCollected: number;
  canShoot: boolean;
  shootCooldownLeft: number;
};

export type CoinDropRuntimeData = {
  value: number;
  source: "player" | "robot" | "reward";
  challengeRunId?: string;
};

export type ArrowRuntimeData = {
  source: "player" | "robot";
  intendedRing?: number;
};

export function createDefaultRuntimeState(): RuntimeState {
  return {
    phase: "boot",
    activeModal: null,
    currentLevelId: 1,
    isGameplayPaused: true,
    isChallengeActive: false,
    challengeTimeLeft: CHALLENGE_DURATION_SECONDS,
    challengeCoinsCollected: 0,
    canShoot: false,
    shootCooldownLeft: 0,
  };
}
