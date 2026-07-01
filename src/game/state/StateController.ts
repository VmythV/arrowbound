import type { GameEventBus } from "../events/GameEventBus";
import { createDefaultRuntimeState } from "./RuntimeState";
import type { GamePhase, ModalType, PauseReason, RuntimeState } from "./RuntimeState";

const ALLOWED_PHASE_TRANSITIONS: Readonly<Record<GamePhase, readonly GamePhase[]>> = {
  boot: ["blessing_select", "playing", "reward"],
  blessing_select: ["playing"],
  playing: ["challenge", "level_transition", "reward"],
  challenge: ["playing", "reward"],
  reward: ["playing"],
  level_transition: ["blessing_select", "playing"],
};

export class StateController {
  private state: RuntimeState;
  private readonly pauseReasons = new Set<PauseReason>();

  constructor(
    private readonly events: GameEventBus,
    initialState: RuntimeState = createDefaultRuntimeState(),
  ) {
    this.state = { ...initialState };
    this.syncDerivedState();
  }

  get snapshot(): Readonly<RuntimeState> {
    return { ...this.state };
  }

  transitionTo(phase: GamePhase): void {
    if (phase === this.state.phase) {
      return;
    }

    if (!ALLOWED_PHASE_TRANSITIONS[this.state.phase].includes(phase)) {
      throw new Error(`Invalid phase transition: ${this.state.phase} -> ${phase}`);
    }

    if (this.state.activeModal !== null) {
      throw new Error("Cannot change phase while a modal is open");
    }

    const previous = this.state.phase;
    this.state.phase = phase;
    this.state.isChallengeActive = phase === "challenge";
    this.syncDerivedState();
    this.events.emit("phase:changed", { previous, current: phase, state: this.snapshot });
    this.emitStateChanged();
  }

  openModal(modal: Exclude<ModalType, null>): void {
    if (this.state.phase !== "playing" && this.state.phase !== "challenge") {
      throw new Error(`Cannot open ${modal} during ${this.state.phase}`);
    }
    if (this.state.activeModal !== null) {
      throw new Error(`Cannot open ${modal}; ${this.state.activeModal} is already open`);
    }

    this.state.activeModal = modal;
    this.pauseReasons.add(modal);
    this.syncDerivedState();
    this.events.emit("modal:changed", { modal, state: this.snapshot });
    this.emitStateChanged();
  }

  closeModal(): void {
    const modal = this.state.activeModal;
    if (modal === null) {
      return;
    }

    this.pauseReasons.delete(modal);
    this.state.activeModal = null;
    this.syncDerivedState();
    this.events.emit("modal:changed", { modal: null, state: this.snapshot });
    this.emitStateChanged();
  }

  setVisibilityPaused(paused: boolean): void {
    if (paused) {
      this.pauseReasons.add("visibility");
    } else {
      this.pauseReasons.delete("visibility");
    }
    this.syncDerivedState();
    this.emitStateChanged();
  }

  tryStartShotCooldown(durationSeconds: number): boolean {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new RangeError("Shot cooldown must be finite and positive");
    }
    if (!this.state.canShoot) {
      return false;
    }

    this.state.shootCooldownLeft = durationSeconds;
    this.syncDerivedState();
    this.emitStateChanged();
    return true;
  }

  addChallengeScore(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("Challenge score increment must be finite and non-negative");
    }
    if (!this.state.isChallengeActive || value === 0) {
      return;
    }
    this.state.challengeCoinsCollected += value;
    this.emitStateChanged();
  }

  advanceShotCooldown(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError("Shot cooldown delta must be finite and non-negative");
    }
    if (this.state.isGameplayPaused || this.state.shootCooldownLeft <= 0 || deltaSeconds === 0) {
      return;
    }

    this.state.shootCooldownLeft = Math.max(0, this.state.shootCooldownLeft - deltaSeconds);
    this.syncDerivedState();
    this.emitStateChanged();
  }

  private syncDerivedState(): void {
    const reasons = [...this.pauseReasons];
    const phasePauseReason =
      this.state.phase === "blessing_select"
        ? "blessing"
        : this.state.phase === "reward"
          ? "chest"
          : undefined;
    const pauseReason = reasons.at(-1) ?? phasePauseReason;
    const activePhase = this.state.phase === "playing" || this.state.phase === "challenge";
    this.state.isGameplayPaused = !activePhase || reasons.length > 0;
    this.state.canShoot =
      !this.state.isGameplayPaused &&
      activePhase &&
      this.state.shootCooldownLeft <= 0;

    if (pauseReason === undefined) {
      delete this.state.pauseReason;
    } else {
      this.state.pauseReason = pauseReason;
    }
  }

  private emitStateChanged(): void {
    this.events.emit("state:changed", { state: this.snapshot });
  }
}
