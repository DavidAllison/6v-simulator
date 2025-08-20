/**
 * Seeded pseudo-random number generator for reproducible simulations
 * Uses the Mulberry32 algorithm for good statistical properties
 */

export class SeededRNG {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed !== undefined ? seed : Date.now();
  }

  /**
   * Reset the generator with a new seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Get the current seed value
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Generate next random number in [0, 1)
   * Uses Mulberry32 algorithm
   */
  random(): number {
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer in [min, max)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Generate random boolean with given probability
   */
  randomBool(probability = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Randomly shuffle an array (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Select random element from array
   */
  choice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length)];
  }

  /**
   * Generate random sample from array without replacement
   */
  sample<T>(array: T[], n: number): T[] {
    if (n >= array.length) {
      return this.shuffle(array);
    }

    const result: T[] = [];
    const indices = new Set<number>();

    while (result.length < n) {
      const idx = this.randomInt(0, array.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        result.push(array[idx]);
      }
    }

    return result;
  }

  /**
   * Generate Gaussian random number using Box-Muller transform
   */
  gaussian(mean = 0, stdDev = 1): number {
    // Use cached value if available
    if (this.hasSpare) {
      this.hasSpare = false;
      return this.spare * stdDev + mean;
    }

    // Generate new pair
    let u = 0;
    let v = 0;
    let s = 0;

    do {
      u = this.random() * 2 - 1;
      v = this.random() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    this.spare = v * mul;
    this.hasSpare = true;

    return u * mul * stdDev + mean;
  }

  private hasSpare = false;
  private spare = 0;

  /**
   * Generate exponential random number
   */
  exponential(lambda = 1): number {
    return -Math.log(1 - this.random()) / lambda;
  }

  /**
   * Create a weighted random selector
   */
  createWeightedSelector<T>(items: T[], weights: number[]): () => T {
    if (items.length !== weights.length) {
      throw new Error('Items and weights must have the same length');
    }

    // Calculate cumulative weights
    const cumulative: number[] = [];
    let sum = 0;

    for (const weight of weights) {
      sum += weight;
      cumulative.push(sum);
    }

    return () => {
      const r = this.random() * sum;

      for (let i = 0; i < cumulative.length; i++) {
        if (r < cumulative[i]) {
          return items[i];
        }
      }

      return items[items.length - 1];
    };
  }
}

/**
 * Global RNG instance for convenience
 */
export const globalRNG = new SeededRNG();

/**
 * Create a new independent RNG instance
 */
export function createRNG(seed?: number): SeededRNG {
  return new SeededRNG(seed);
}

/**
 * Generate a random seed from current time and Math.random
 */
export function generateSeed(): number {
  return Math.floor(Date.now() * Math.random());
}
