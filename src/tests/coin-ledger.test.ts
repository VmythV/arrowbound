import { describe, expect, it } from "vitest";
import type { GameEventBus } from "../game/events/GameEventBus";
import { CoinLedger, type ChallengeScoring } from "../game/systems/CoinLedger";

type EmittedEvent = { event: string; payload: unknown };

function createEventSink(log: EmittedEvent[]): GameEventBus {
  return {
    emit: (event: string, payload: unknown) => {
      log.push({ event, payload });
      return true;
    },
  } as unknown as GameEventBus;
}

function createChallenge(
  snapshot: { isChallengeActive: boolean; challengeRunId?: string },
): ChallengeScoring & { scored: number } {
  return {
    snapshot,
    scored: 0,
    addChallengeScore(value: number) {
      this.scored += value;
    },
  };
}

describe("CoinLedger", () => {
  it("adds coin value to the wallet and cumulative total, emitting collect and wallet events", () => {
    const log: EmittedEvent[] = [];
    const ledger = new CoinLedger(createEventSink(log), createChallenge({ isChallengeActive: false }));

    expect(ledger.collectCoin({ id: 1, value: 5, source: "player" })).toBe(true);

    expect(ledger.coins).toBe(5);
    expect(ledger.totalCoinsEarned).toBe(5);
    expect(log).toEqual([
      { event: "coin:collected", payload: { value: 5, coins: 5, source: "player" } },
      { event: "wallet:changed", payload: { coins: 5, delta: 5, reason: "collect" } },
    ]);
  });

  it("never accounts the same coin twice", () => {
    const log: EmittedEvent[] = [];
    const ledger = new CoinLedger(createEventSink(log), createChallenge({ isChallengeActive: false }));

    expect(ledger.collectCoin({ id: 7, value: 4, source: "player" })).toBe(true);
    expect(ledger.collectCoin({ id: 7, value: 4, source: "player" })).toBe(false);

    expect(ledger.coins).toBe(4);
    expect(log.filter((entry) => entry.event === "coin:collected")).toHaveLength(1);
  });

  it("spends from the wallet only when the balance is sufficient", () => {
    const log: EmittedEvent[] = [];
    const ledger = new CoinLedger(
      createEventSink(log),
      createChallenge({ isChallengeActive: false }),
      50,
      50,
    );

    expect(ledger.spend(30)).toBe(true);
    expect(ledger.coins).toBe(20);
    expect(ledger.spend(25)).toBe(false);
    expect(ledger.coins).toBe(20);
    expect(ledger.totalCoinsEarned).toBe(50);
    expect(log).toContainEqual({
      event: "wallet:changed",
      payload: { coins: 20, delta: -30, reason: "spend" },
    });
    expect(() => ledger.spend(-1)).toThrow(RangeError);
  });

  it("adds challenge score only when the run id matches an active challenge", () => {
    const challenge = createChallenge({ isChallengeActive: true, challengeRunId: "run-a" });
    const ledger = new CoinLedger(createEventSink([]), challenge);

    ledger.collectCoin({ id: 1, value: 3, source: "player", challengeRunId: "run-a" });
    ledger.collectCoin({ id: 2, value: 9, source: "robot", challengeRunId: "run-b" });
    ledger.collectCoin({ id: 3, value: 2, source: "player" });

    expect(ledger.coins).toBe(14);
    expect(challenge.scored).toBe(3);
  });

  it("does not score coins when no challenge is active even if an id is present", () => {
    const challenge = createChallenge({ isChallengeActive: false, challengeRunId: "run-a" });
    const ledger = new CoinLedger(createEventSink([]), challenge);

    ledger.collectCoin({ id: 1, value: 3, source: "player", challengeRunId: "run-a" });

    expect(ledger.coins).toBe(3);
    expect(challenge.scored).toBe(0);
  });

  it("allows a reused id after level tracking is reset", () => {
    const ledger = new CoinLedger(createEventSink([]), createChallenge({ isChallengeActive: false }));

    expect(ledger.collectCoin({ id: 1, value: 2, source: "player" })).toBe(true);
    ledger.resetLevelTracking();
    expect(ledger.collectCoin({ id: 1, value: 2, source: "player" })).toBe(true);
    expect(ledger.coins).toBe(4);
  });

  it("seeds an initial balance and rejects non-positive-integer values", () => {
    const ledger = new CoinLedger(
      createEventSink([]),
      createChallenge({ isChallengeActive: false }),
      120,
      120,
    );
    expect(ledger.coins).toBe(120);
    expect(() => ledger.collectCoin({ id: 1, value: 0, source: "player" })).toThrow(RangeError);
    expect(() => ledger.collectCoin({ id: 2, value: 1.5, source: "player" })).toThrow(RangeError);
  });
});
