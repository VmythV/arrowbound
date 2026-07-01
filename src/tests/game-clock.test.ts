import { describe, expect, it, vi } from "vitest";
import { GameClock } from "../game/systems/GameClock";

describe("GameClock", () => {
  it("does not advance timers while paused", () => {
    const clock = new GameClock();
    const callback = vi.fn();
    clock.schedule(1_000, callback);

    clock.update(400);
    clock.setPaused(true);
    clock.update(5_000);
    expect(clock.now).toBe(400);
    expect(callback).not.toHaveBeenCalled();

    clock.setPaused(false);
    clock.update(600);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("runs repeating tasks deterministically after a long frame", () => {
    const clock = new GameClock();
    const callback = vi.fn();
    clock.scheduleRepeating(250, callback);
    clock.update(1_000);
    expect(callback).toHaveBeenCalledTimes(4);
  });
});
