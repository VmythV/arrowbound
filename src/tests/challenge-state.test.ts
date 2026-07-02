import { describe, expect, it } from "vitest";
import type { GameEventBus } from "../game/events/GameEventBus";
import { StateController } from "../game/state/StateController";

function createEventSink(): GameEventBus {
  return { emit: () => false } as unknown as GameEventBus;
}

function playingController(): StateController {
  const controller = new StateController(createEventSink());
  controller.transitionTo("playing");
  return controller;
}

describe("StateController challenge lifecycle", () => {
  it("starts a challenge from playing with a fresh run, timer, and zero score", () => {
    const controller = playingController();
    controller.startChallenge("run-1", 60);
    const snapshot = controller.snapshot;
    expect(snapshot.phase).toBe("challenge");
    expect(snapshot.isChallengeActive).toBe(true);
    expect(snapshot.challengeRunId).toBe("run-1");
    expect(snapshot.challengeTimeLeft).toBe(60);
    expect(snapshot.challengeCoinsCollected).toBe(0);
  });

  it("only starts a challenge from the playing phase", () => {
    const controller = new StateController(createEventSink());
    expect(() => controller.startChallenge("run-x", 60)).toThrow();
  });

  it("counts down only while active and unpaused", () => {
    const controller = playingController();
    controller.startChallenge("run-1", 60);
    expect(controller.advanceChallengeTime(10)).toBe(50);

    controller.openModal("shop"); // pauses the challenge
    expect(controller.advanceChallengeTime(10)).toBe(50);
    controller.closeModal();
    expect(controller.advanceChallengeTime(5)).toBe(45);
    expect(controller.advanceChallengeTime(100)).toBe(0); // clamps at zero
  });

  it("adds challenge score only while a challenge is active", () => {
    const controller = playingController();
    controller.addChallengeScore(5);
    expect(controller.snapshot.challengeCoinsCollected).toBe(0);

    controller.startChallenge("run-1", 60);
    controller.addChallengeScore(5);
    controller.addChallengeScore(3);
    expect(controller.snapshot.challengeCoinsCollected).toBe(8);
  });

  it("clears the run id when the challenge ends so late pickups cannot score", () => {
    const controller = playingController();
    controller.startChallenge("run-1", 60);
    controller.endChallengeRun();
    expect(controller.snapshot.challengeRunId).toBeUndefined();
    // 退出挑战相位后分数不再增加。
    controller.transitionTo("playing");
    controller.addChallengeScore(9);
    expect(controller.snapshot.challengeCoinsCollected).toBe(0);
  });
});
