export type ClockTaskId = number;

type ClockTask = {
  readonly id: ClockTaskId;
  readonly callback: () => void;
  readonly repeatIntervalMs?: number;
  nextRunAtMs: number;
};

export class GameClock {
  private elapsedMs = 0;
  private nextTaskId = 1;
  private paused = false;
  private readonly tasks = new Map<ClockTaskId, ClockTask>();

  get now(): number {
    return this.elapsedMs;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  schedule(delayMs: number, callback: () => void): ClockTaskId {
    return this.addTask(delayMs, callback);
  }

  scheduleRepeating(intervalMs: number, callback: () => void): ClockTaskId {
    return this.addTask(intervalMs, callback, intervalMs);
  }

  cancel(taskId: ClockTaskId): boolean {
    return this.tasks.delete(taskId);
  }

  clear(): void {
    this.tasks.clear();
  }

  update(deltaMs: number): void {
    if (this.paused) {
      return;
    }
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError("Clock delta must be finite and non-negative");
    }

    this.elapsedMs += deltaMs;
    const dueTasks = [...this.tasks.values()]
      .filter((task) => task.nextRunAtMs <= this.elapsedMs)
      .sort((left, right) => left.nextRunAtMs - right.nextRunAtMs || left.id - right.id);

    for (const task of dueTasks) {
      while (this.tasks.has(task.id) && task.nextRunAtMs <= this.elapsedMs) {
        if (task.repeatIntervalMs === undefined) {
          this.tasks.delete(task.id);
        } else {
          task.nextRunAtMs += task.repeatIntervalMs;
        }
        task.callback();
      }
    }
  }

  private addTask(delayMs: number, callback: () => void, repeatIntervalMs?: number): ClockTaskId {
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
      throw new RangeError("Clock delay must be finite and positive");
    }

    const id = this.nextTaskId;
    this.nextTaskId += 1;
    const task: ClockTask = {
      id,
      callback,
      nextRunAtMs: this.elapsedMs + delayMs,
      ...(repeatIntervalMs === undefined ? {} : { repeatIntervalMs }),
    };
    this.tasks.set(id, task);
    return id;
  }
}
