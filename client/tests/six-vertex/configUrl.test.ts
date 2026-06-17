/**
 * Tests for the shareable-config URL codec (issue #60).
 */

import { describe, it, expect } from '@jest/globals';
import {
  encodeConfig,
  decodeConfig,
  buildShareUrl,
  readConfigFromSearch,
  type ShareableConfig,
} from '../../src/lib/six-vertex/configUrl';
import { BoundaryCondition, RenderMode } from '../../src/lib/six-vertex/types';

const sample: ShareableConfig = {
  latticeSize: 24,
  stepsPerFrame: 50,
  temperature: 0.75,
  boundaryCondition: BoundaryCondition.DWBC,
  dwbcType: 'low',
  renderMode: RenderMode.Both,
  showGrid: false,
  animateFlips: true,
  seed: 987654,
  weights: { a1: 1, a2: 1.5, b1: 2, b2: 0.5, c1: 1.25, c2: 3 },
};

describe('configUrl codec', () => {
  it('round-trips a full config losslessly', () => {
    const decoded = decodeConfig(encodeConfig(sample));
    expect(decoded).toEqual(sample);
  });

  it('buildShareUrl produces a parseable URL that decodes back', () => {
    const url = buildShareUrl(sample, 'https://6v.allison.la/');
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://6v.allison.la/');
    expect(decodeConfig(parsed.searchParams)).toEqual(sample);
  });

  it('returns an empty object for an empty query', () => {
    expect(decodeConfig(new URLSearchParams(''))).toEqual({});
    expect(readConfigFromSearch('')).toEqual({});
  });

  it('returns only the fields present (partial config)', () => {
    const decoded = readConfigFromSearch('?n=16&s=42');
    expect(decoded).toEqual({ latticeSize: 16, seed: 42 });
  });

  it('drops out-of-range and malformed values rather than throwing', () => {
    // size below min, temperature above max, fractional steps, bad enum, short weights
    const decoded = readConfigFromSearch(
      '?n=1&t=999&spf=2.5&bc=banana&rm=hologram&dw=sideways&w=1,2,3&g=maybe&s=-4',
    );
    expect(decoded).toEqual({});
  });

  it('accepts boolean aliases (1/0, true/false)', () => {
    expect(readConfigFromSearch('?g=true&af=0')).toEqual({ showGrid: true, animateFlips: false });
    expect(readConfigFromSearch('?g=1&af=false')).toEqual({ showGrid: true, animateFlips: false });
  });

  it('rejects a weights list with the wrong arity or a negative weight', () => {
    expect(readConfigFromSearch('?w=1,2,3,4,5')).toEqual({}); // 5 entries
    expect(readConfigFromSearch('?w=1,1,1,1,1,-1')).toEqual({}); // negative
    expect(readConfigFromSearch('?w=0,0,0,0,0,0')).toEqual({
      weights: { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0 },
    }); // zero is allowed
  });

  it('ignores unknown params', () => {
    expect(readConfigFromSearch('?n=8&unknown=xyz&foo=1')).toEqual({ latticeSize: 8 });
  });
});
