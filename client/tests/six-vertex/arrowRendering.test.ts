/**
 * Regression tests for arrow rendering against lattice states whose edge arrays
 * are empty (as produced by the optimized simulation engine consumed by the
 * dual-simulation view). The renderer must reconstruct the edges from the
 * vertex configurations instead of crashing with
 * "Cannot read properties of undefined (reading '0')".
 *
 * Repro: toggling "Show Arrows" on /dual-simulation. The optimized engine's
 * getState() returns horizontalEdges: [] / verticalEdges: [] with the full
 * configuration carried only on vertices[r][c].configuration.
 */

import { PathRenderer } from '../../src/lib/six-vertex/renderer/pathRenderer';
import { generateDWBCHigh, generateDWBCLow } from '../../src/lib/six-vertex/initialStates';
import { RenderMode } from '../../src/lib/six-vertex/types';
import type { LatticeState } from '../../src/lib/six-vertex/types';

/**
 * Minimal canvas mock with a back-reference so renderers that read
 * ctx.canvas.{width,height} (e.g. paperStyleRenderer) work. Mirrors the mock in
 * rendering.test.ts; the global jest setup mock omits the canvas back-reference.
 */
class MockCanvasContext {
  canvas: MockCanvas;
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  globalAlpha = 1;
  font = '12px sans-serif';
  textAlign = 'left';
  textBaseline = 'alphabetic';
  lineCap = 'butt';
  lineJoin = 'miter';

  constructor(canvas: MockCanvas) {
    this.canvas = canvas;
  }

  save(): void {}
  restore(): void {}
  setLineDash(): void {}
  clearRect(): void {}
  fillRect(): void {}
  strokeRect(): void {}
  beginPath(): void {}
  closePath(): void {}
  moveTo(_x?: number, _y?: number): void {}
  lineTo(_x?: number, _y?: number): void {}
  quadraticCurveTo(): void {}
  bezierCurveTo(): void {}
  arc(): void {}
  fill(): void {}
  stroke(): void {}
  fillText(): void {}
  translate(): void {}
  scale(): void {}
}

class MockCanvas {
  width = 400;
  height = 400;
  context: MockCanvasContext;

  constructor() {
    this.context = new MockCanvasContext(this);
  }

  getContext(type: string): MockCanvasContext | null {
    return type === '2d' ? this.context : null;
  }
}

function makeRenderer(config?: Parameters<typeof PathRenderer.prototype.updateConfig>[0]) {
  const canvas = new MockCanvas();
  const renderer = new PathRenderer(canvas as unknown as HTMLCanvasElement, config);
  return { canvas, renderer };
}

/**
 * Produce a copy of a lattice state with EMPTY edge arrays, mimicking the
 * optimized engine's getState() output (vertices populated, edges = []).
 */
function withEmptyEdges(state: LatticeState): LatticeState {
  return { ...state, horizontalEdges: [], verticalEdges: [] };
}

/**
 * Recording context that captures every line segment (moveTo -> lineTo) so tests
 * can assert what was actually drawn. Used to lock the arrow geometry: arrows
 * must be non-degenerate and must reflect the per-vertex configuration.
 */
class RecordingContext extends MockCanvasContext {
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  private cx = 0;
  private cy = 0;
  override moveTo(x = 0, y = 0): void {
    this.cx = x;
    this.cy = y;
  }
  override lineTo(x = 0, y = 0): void {
    this.segments.push({ x1: this.cx, y1: this.cy, x2: x, y2: y });
    this.cx = x;
    this.cy = y;
  }
}

class RecordingCanvas extends MockCanvas {
  override context: RecordingContext;
  constructor() {
    super();
    this.context = new RecordingContext(this);
  }
  override getContext(type: string): RecordingContext | null {
    return type === '2d' ? this.context : null;
  }
}

describe('arrow rendering with empty edge arrays (optimized engine states)', () => {
  it('does not throw in Arrows mode for a DWBC High state with empty edges', () => {
    const { renderer } = makeRenderer({ mode: RenderMode.Arrows });
    expect(() => renderer.render(withEmptyEdges(generateDWBCHigh(8)))).not.toThrow();
  });

  it('does not throw in Arrows mode for a DWBC Low state with empty edges', () => {
    const { renderer } = makeRenderer({ mode: RenderMode.Arrows });
    expect(() => renderer.render(withEmptyEdges(generateDWBCLow(8)))).not.toThrow();
  });

  it('does not throw in Both mode (paths + arrows) with empty edges', () => {
    const { renderer } = makeRenderer({ mode: RenderMode.Both });
    expect(() => renderer.render(withEmptyEdges(generateDWBCLow(8)))).not.toThrow();
  });

  it('still renders Arrows mode when edge arrays are populated', () => {
    const { renderer } = makeRenderer({ mode: RenderMode.Arrows });
    expect(() => renderer.render(generateDWBCHigh(8))).not.toThrow();
  });

  // --- Regression: arrows must reflect state and not be degenerate ---------
  // A prior bug computed horizontal arrow endpoints as
  //   x1 = col*cell + cell/2,  x2 = (col+1)*cell - cell/2  (== x1)
  // so every arrow was a zero-length segment that drawArrow() rendered as a
  // fixed-orientation arrowhead, identical for every edge regardless of In/Out.
  // Result: a uniform arrow field that never changed as the simulation stepped.
  function renderArrowSegments(state: LatticeState) {
    const canvas = new RecordingCanvas();
    const renderer = new PathRenderer(canvas as unknown as HTMLCanvasElement, {
      mode: RenderMode.Arrows,
      cellSize: 20,
    });
    renderer.render(state);
    return canvas.context.segments;
  }

  it('draws non-degenerate arrow shafts (not zero-length segments)', () => {
    const segments = renderArrowSegments(withEmptyEdges(generateDWBCHigh(8)));
    const nonDegenerate = segments.filter((s) => s.x1 !== s.x2 || s.y1 !== s.y2);
    expect(nonDegenerate.length).toBeGreaterThan(0);
    // There must be genuinely horizontal shafts (y constant, x varying) and
    // vertical shafts (x constant, y varying) — the degenerate bug had neither.
    expect(segments.some((s) => s.y1 === s.y2 && Math.abs(s.x1 - s.x2) > 1)).toBe(true);
    expect(segments.some((s) => s.x1 === s.x2 && Math.abs(s.y1 - s.y2) > 1)).toBe(true);
  });

  it('produces different arrows for different configurations (not a frozen field)', () => {
    const high = renderArrowSegments(withEmptyEdges(generateDWBCHigh(8)));
    const low = renderArrowSegments(withEmptyEdges(generateDWBCLow(8)));
    const key = (segs: typeof high) => segs.map((s) => `${s.x1},${s.y1},${s.x2},${s.y2}`).join('|');
    // DWBC High and Low have different vertex configurations, so their arrow
    // fields must differ. The degenerate bug rendered both identically.
    expect(key(high)).not.toBe(key(low));
  });
});
