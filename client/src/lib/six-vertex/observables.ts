/**
 * Derived physical observables for the 6-vertex model.
 *
 * Kept separate from the engine so the UI shows only quantities that are
 * actually computed (no permanent N/A placeholders). Additional audited
 * observables (volume, entropy, …) should be added here with references.
 */

import type { VertexType } from './types';

export type VertexWeights = Record<VertexType, number>;

/**
 * Anisotropy parameter Δ = (a² + b² − c²) / (2ab), the standard quantity that
 * selects the 6-vertex model's phase (Δ > 1 ferroelectric, −1 < Δ < 1
 * disordered, Δ < −1 antiferroelectric). a, b, c are the three Boltzmann
 * weights; with the UI's six independent weights we use the symmetric averages
 * a = (a1+a2)/2, b = (b1+b2)/2, c = (c1+c2)/2.
 *
 * Returns null when it is not well defined (non-positive a·b), so callers can
 * show "—" rather than a misleading number.
 */
export function anisotropyDelta(weights: VertexWeights): number | null {
  const a = (weights.a1 + weights.a2) / 2;
  const b = (weights.b1 + weights.b2) / 2;
  const c = (weights.c1 + weights.c2) / 2;
  const denom = 2 * a * b;
  if (denom <= 0) return null;
  return (a * a + b * b - c * c) / denom;
}
