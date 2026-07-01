import { describe, expect, it } from "vitest";
import type { GameEventBus } from "../game/events/GameEventBus";
import { StateController } from "../game/state/StateController";

function createEventSink(): GameEventBus {
  return { emit: () => false } as unknown as GameEventBus;
}

describe("StateController", () => {
  it("enforces phase transitions and derives pause state", () => {
    const controller = new StateController(createEventSink());

    expect(controller.snapshot.isGameplayPaused).toBe(true);
    controller.transitionTo("blessing_select");
    expect(controller.snapshot.pauseReason).toBe("blessing");
    controller.transitionTo("playing");
    expect(controller.snapshot.isGameplayPaused).toBe(false);
    expect(controller.snapshot.canShoot).toBe(true);
    controller.transitionTo("challenge");
    expect(controller.snapshot.isChallengeActive).toBe(true);
  });

  it("keeps visibility pause active after closing a modal", () => {
    const controller = new StateController(createEventSink());
    controller.transitionTo("playing");
    controller.openModal("shop");
    controller.setVisibilityPaused(true);
    controller.closeModal();

    expect(controller.snapshot.activeModal).toBeNull();
    expect(controller.snapshot.isGameplayPaused).toBe(true);
    expect(controller.snapshot.pauseReason).toBe("visibility");
    controller.setVisibilityPaused(false);
    expect(controller.snapshot.isGameplayPaused).toBe(false);
  });

  it("rejects invalid transitions and nested modals", () => {
    const controller = new StateController(createEventSink());
    expect(() => controller.transitionTo("challenge")).toThrow("Invalid phase transition");
    controller.transitionTo("playing");
    controller.openModal("settings");
    expect(() => controller.openModal("shop")).toThrow("already open");
    expect(() => controller.transitionTo("challenge")).toThrow("while a modal is open");
  });

  it("starts shot cooldown atomically and only advances it while gameplay is active", () => {
    const controller = new StateController(createEventSink());
    controller.transitionTo("playing");

    expect(controller.tryStartShotCooldown(1.2)).toBe(true);
    expect(controller.tryStartShotCooldown(1.2)).toBe(false);
    controller.advanceShotCooldown(0.4);
    expect(controller.snapshot.shootCooldownLeft).toBeCloseTo(0.8, 10);

    controller.setVisibilityPaused(true);
    controller.advanceShotCooldown(10);
    expect(controller.snapshot.shootCooldownLeft).toBeCloseTo(0.8, 10);

    controller.setVisibilityPaused(false);
    controller.advanceShotCooldown(0.8);
    expect(controller.snapshot.shootCooldownLeft).toBe(0);
    expect(controller.snapshot.canShoot).toBe(true);
  });
});
