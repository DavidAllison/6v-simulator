import { SeededRNG, createRNG, generateSeed } from '../../src/lib/six-vertex/rng';

describe('SeededRNG', () => {
  describe('Deterministic behavior', () => {
    it('should produce same sequence with same seed', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const sequence1 = Array.from({ length: 10 }, () => rng1.random());
      const sequence2 = Array.from({ length: 10 }, () => rng2.random());

      expect(sequence1).toEqual(sequence2);
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(54321);

      const sequence1 = Array.from({ length: 10 }, () => rng1.random());
      const sequence2 = Array.from({ length: 10 }, () => rng2.random());

      expect(sequence1).not.toEqual(sequence2);
    });

    it('should reset to same sequence after setSeed', () => {
      const rng = new SeededRNG(12345);

      const sequence1 = Array.from({ length: 5 }, () => rng.random());

      rng.setSeed(12345);
      const sequence2 = Array.from({ length: 5 }, () => rng.random());

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe('random()', () => {
    it('should generate values in [0, 1)', () => {
      const rng = new SeededRNG(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should have reasonable distribution', () => {
      const rng = new SeededRNG(12345);
      const buckets = [0, 0, 0, 0]; // 4 quarters
      const samples = 10000;

      for (let i = 0; i < samples; i++) {
        const value = rng.random();
        const bucket = Math.floor(value * 4);
        buckets[Math.min(bucket, 3)]++;
      }

      // Each bucket should have roughly 25% of samples (within 5% tolerance)
      const expectedCount = samples / 4;
      for (const count of buckets) {
        expect(count).toBeGreaterThan(expectedCount * 0.8);
        expect(count).toBeLessThan(expectedCount * 1.2);
      }
    });
  });

  describe('randomInt()', () => {
    it('should generate integers in [min, max)', () => {
      const rng = new SeededRNG(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.randomInt(5, 10);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThan(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should generate all values in range', () => {
      const rng = new SeededRNG(12345);
      const seen = new Set<number>();

      for (let i = 0; i < 1000; i++) {
        seen.add(rng.randomInt(0, 5));
      }

      expect(seen.has(0)).toBe(true);
      expect(seen.has(1)).toBe(true);
      expect(seen.has(2)).toBe(true);
      expect(seen.has(3)).toBe(true);
      expect(seen.has(4)).toBe(true);
      expect(seen.has(5)).toBe(false);
    });
  });

  describe('randomBool()', () => {
    it('should generate booleans with default 0.5 probability', () => {
      const rng = new SeededRNG(12345);
      let trueCount = 0;
      const samples = 10000;

      for (let i = 0; i < samples; i++) {
        if (rng.randomBool()) {
          trueCount++;
        }
      }

      const ratio = trueCount / samples;
      expect(ratio).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.55);
    });

    it('should respect custom probability', () => {
      const rng = new SeededRNG(12345);
      let trueCount = 0;
      const samples = 10000;
      const probability = 0.3;

      for (let i = 0; i < samples; i++) {
        if (rng.randomBool(probability)) {
          trueCount++;
        }
      }

      const ratio = trueCount / samples;
      expect(ratio).toBeGreaterThan(0.25);
      expect(ratio).toBeLessThan(0.35);
    });
  });

  describe('shuffle()', () => {
    it('should return shuffled array with same elements', () => {
      const rng = new SeededRNG(12345);
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(original);

      expect(shuffled).toHaveLength(original.length);
      expect(new Set(shuffled)).toEqual(new Set(original));
      expect(original).toEqual([1, 2, 3, 4, 5]); // Original unchanged
    });

    it('should produce different permutations', () => {
      const rng = new SeededRNG(12345);
      const array = [1, 2, 3, 4, 5];

      const permutations = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const shuffled = rng.shuffle(array);
        permutations.add(shuffled.join(','));
      }

      // Should generate multiple different permutations
      expect(permutations.size).toBeGreaterThan(10);
    });
  });

  describe('choice()', () => {
    it('should select element from array', () => {
      const rng = new SeededRNG(12345);
      const array = ['a', 'b', 'c', 'd'];

      for (let i = 0; i < 100; i++) {
        const choice = rng.choice(array);
        expect(array).toContain(choice);
      }
    });

    it('should select all elements over time', () => {
      const rng = new SeededRNG(12345);
      const array = ['a', 'b', 'c'];
      const seen = new Set<string>();

      for (let i = 0; i < 100; i++) {
        seen.add(rng.choice(array));
      }

      expect(seen.size).toBe(array.length);
    });
  });

  describe('sample()', () => {
    it('should return n unique elements', () => {
      const rng = new SeededRNG(12345);
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sample = rng.sample(array, 5);

      expect(sample).toHaveLength(5);
      expect(new Set(sample).size).toBe(5);

      for (const item of sample) {
        expect(array).toContain(item);
      }
    });

    it('should return shuffled array when n >= array.length', () => {
      const rng = new SeededRNG(12345);
      const array = [1, 2, 3, 4, 5];
      const sample = rng.sample(array, 10);

      expect(sample).toHaveLength(array.length);
      expect(new Set(sample)).toEqual(new Set(array));
    });
  });

  describe('gaussian()', () => {
    it('should generate values with correct mean and stdDev', () => {
      const rng = new SeededRNG(12345);
      const mean = 10;
      const stdDev = 2;
      const samples = 10000;

      const values: number[] = [];
      for (let i = 0; i < samples; i++) {
        values.push(rng.gaussian(mean, stdDev));
      }

      const actualMean = values.reduce((a, b) => a + b, 0) / samples;
      const variance = values.reduce((sum, x) => sum + Math.pow(x - actualMean, 2), 0) / samples;
      const actualStdDev = Math.sqrt(variance);

      expect(actualMean).toBeCloseTo(mean, 0);
      expect(actualStdDev).toBeCloseTo(stdDev, 0);
    });
  });

  describe('createWeightedSelector()', () => {
    it('should select items according to weights', () => {
      const rng = new SeededRNG(12345);
      const items = ['a', 'b', 'c'];
      const weights = [1, 2, 7]; // 10%, 20%, 70%

      const selector = rng.createWeightedSelector(items, weights);
      const counts = { a: 0, b: 0, c: 0 };
      const samples = 10000;

      for (let i = 0; i < samples; i++) {
        const item = selector();
        counts[item as keyof typeof counts]++;
      }

      expect(counts.a / samples).toBeCloseTo(0.1, 1);
      expect(counts.b / samples).toBeCloseTo(0.2, 1);
      expect(counts.c / samples).toBeCloseTo(0.7, 1);
    });

    it('should throw error for mismatched arrays', () => {
      const rng = new SeededRNG(12345);
      expect(() => {
        rng.createWeightedSelector(['a', 'b'], [1, 2, 3]);
      }).toThrow();
    });
  });

  describe('Helper functions', () => {
    it('createRNG should create new instance', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);

      expect(rng1).not.toBe(rng2);
      expect(rng1.random()).toBe(rng2.random());
    });

    it('generateSeed should create different seeds', () => {
      const seeds = new Set<number>();

      for (let i = 0; i < 10; i++) {
        seeds.add(generateSeed());
      }

      // Should generate different seeds (very unlikely to collide)
      expect(seeds.size).toBeGreaterThan(5);
    });
  });
});
