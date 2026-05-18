import { randomInt } from "node:crypto";

export interface Rng {
  next(): number;
  pickWeighted<T>(items: WeightedItem<T>[]): T;
}

export type WeightedItem<T> = {
  value: T;
  weight: number;
};

const RANDOM_RANGE = 2 ** 48 - 1;

export class CryptoRng implements Rng {
  next(): number {
    return randomInt(0, RANDOM_RANGE) / RANDOM_RANGE;
  }

  pickWeighted<T>(items: WeightedItem<T>[]): T {
    return pickWeighted(items, this.next());
  }
}

export class SeededRng implements Rng {
  private state: number;

  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  pickWeighted<T>(items: WeightedItem<T>[]): T {
    return pickWeighted(items, this.next());
  }
}

function pickWeighted<T>(items: WeightedItem<T>[], randomUnit: number): T {
  if (items.length === 0) {
    throw new RangeError("Cannot pick from an empty weighted item list.");
  }

  const total = items.reduce((sum, item) => {
    if (!Number.isFinite(item.weight) || item.weight <= 0) {
      throw new RangeError("Weighted item weights must be positive finite numbers.");
    }

    return sum + item.weight;
  }, 0);
  let roll = randomUnit * total;

  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1]!.value;
}
