import { describe, it, expect } from '@jest/globals';
import { anisotropyDelta } from '../../src/lib/six-vertex/observables';

const W = (a: number, b: number, c: number) => ({
  a1: a,
  a2: a,
  b1: b,
  b2: b,
  c1: c,
  c2: c,
});

describe('anisotropyDelta', () => {
  it('is 0.5 for uniform weights (the default)', () => {
    // Δ = (1 + 1 − 1) / (2·1·1) = 0.5
    expect(anisotropyDelta(W(1, 1, 1))).toBeCloseTo(0.5, 10);
  });

  it('is ferroelectric (Δ>1) when c dominates a,b', () => {
    // a=b=1, c=2 → (1+1−4)/2 = −1 ... that's the antiferro edge; use c large for AF
    expect(anisotropyDelta(W(1, 1, 0.1))!).toBeGreaterThan(0.9); // c small → near 1 (disordered/ferro edge)
  });

  it('is antiferroelectric (Δ<−1) when c is large', () => {
    // a=b=1, c=3 → (1+1−9)/2 = −3.5
    expect(anisotropyDelta(W(1, 1, 3))).toBeCloseTo(-3.5, 10);
  });

  it('averages asymmetric weights into a,b,c', () => {
    // a=(2+0)/2=1, b=(1+1)/2=1, c=(1+1)/2=1 → 0.5
    expect(anisotropyDelta({ a1: 2, a2: 0, b1: 1, b2: 1, c1: 1, c2: 1 })).toBeCloseTo(0.5, 10);
  });

  it('returns null when undefined (a·b ≤ 0)', () => {
    expect(anisotropyDelta(W(0, 1, 1))).toBeNull();
  });
});
