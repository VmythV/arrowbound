export type WeightedItem<T> = {
  readonly value: T;
  readonly weight: number;
};

export interface RandomSource {
  next(): number;
}

export class RandomService implements RandomSource {
  private state: number;

  constructor(seed: string | number = createSystemSeed()) {
    this.state = typeof seed === "number" ? normalizeSeed(seed) : hashSeed(seed);
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  integer(minimum: number, maximum: number): number {
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || maximum < minimum) {
      throw new RangeError("Random integer bounds must be ordered integers");
    }
    return Math.floor(this.next() * (maximum - minimum + 1)) + minimum;
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new RangeError("Cannot pick from an empty collection");
    }
    return values[this.integer(0, values.length - 1)] as T;
  }

  weightedPick<T>(items: readonly WeightedItem<T>[]): T {
    const totalWeight = validateWeights(items);
    let remaining = this.next() * totalWeight;

    for (const item of items) {
      remaining -= item.weight;
      if (remaining < 0) {
        return item.value;
      }
    }

    return items.at(-1)?.value as T;
  }

  weightedSampleWithoutReplacement<T>(items: readonly WeightedItem<T>[], count: number): T[] {
    if (!Number.isInteger(count) || count < 0 || count > items.length) {
      throw new RangeError("Sample count must fit the collection");
    }

    const remaining = [...items];
    const result: T[] = [];

    for (let index = 0; index < count; index += 1) {
      const selected = this.weightedPick(remaining);
      result.push(selected);
      const selectedIndex = remaining.findIndex((item) => Object.is(item.value, selected));
      remaining.splice(selectedIndex, 1);
    }

    return result;
  }
}

function validateWeights<T>(items: readonly WeightedItem<T>[]): number {
  if (items.length === 0) {
    throw new RangeError("Weighted collection cannot be empty");
  }

  const total = items.reduce((sum, item) => {
    if (!Number.isFinite(item.weight) || item.weight <= 0) {
      throw new RangeError("Weights must be finite and positive");
    }
    return sum + item.weight;
  }, 0);

  return total;
}

function createSystemSeed(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] ?? 1;
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    throw new RangeError("Seed must be finite");
  }
  return Math.trunc(seed) >>> 0;
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}
