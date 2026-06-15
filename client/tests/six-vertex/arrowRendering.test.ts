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
import { RenderMode, EdgeState } from '../../src/lib/six-vertex/types';
import type { LatticeState, VertexConfiguration } from '../../src/lib/six-vertex/types';

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
  moveTo(): void {}
  lineTo(): void {}
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

const oppositeOf = (e: EdgeState): EdgeState => (e === EdgeState.In ? EdgeState.Out : EdgeState.In);

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

  it('reconstructs edges via the canonical inverse mapping from initialStates.ts', () => {
    // The reconstruction is the exact inverse of the forward mapping the lattice
    // builders use (initialStates.ts ~L136-141):
    //   left   = oppositeOf(horizontalEdges[r][c])     -> H[r][0]     = oppositeOf(left)
    //   right  = horizontalEdges[r][c + 1]             -> H[r][c + 1] = right
    //   top    = oppositeOf(verticalEdges[r][c])       -> V[0][c]     = oppositeOf(top)
    //   bottom = verticalEdges[r + 1][c]               -> V[r + 1][c] = bottom
    //
    // Note: DWBC vertex configurations are per-vertex Fig.1 configs and are NOT
    // globally edge-consistent between neighbors (a vertex's left edge does not
    // generally equal oppositeOf its left neighbor's right edge). So we verify
    // each edge against the SOURCE vertex the inverse derives it from, not a
    // round-trip through all four edges of every vertex.
    const reference = generateDWBCLow(6);
    const stripped = withEmptyEdges(reference);

    const renderer = new PathRenderer(new MockCanvas() as unknown as HTMLCanvasElement, {
      mode: RenderMode.Arrows,
    });
    const ensureEdges = (
      renderer as unknown as {
        ensureEdges(s: LatticeState): {
          horizontalEdges: EdgeState[][];
          verticalEdges: EdgeState[][];
        };
      }
    ).ensureEdges.bind(renderer);

    const { horizontalEdges, verticalEdges } = ensureEdges(stripped);

    // Dimensions follow the canonical builder convention.
    expect(horizontalEdges.length).toBe(reference.height);
    expect(horizontalEdges[0].length).toBe(reference.width + 1);
    expect(verticalEdges.length).toBe(reference.height + 1);
    expect(verticalEdges[0].length).toBe(reference.width);

    for (let row = 0; row < reference.height; row++) {
      for (let col = 0; col < reference.width; col++) {
        const cfg: VertexConfiguration = reference.vertices[row][col].configuration;
        // Each vertex's RIGHT and BOTTOM edges are derived directly from it.
        expect(horizontalEdges[row][col + 1]).toBe(cfg.right);
        expect(verticalEdges[row + 1][col]).toBe(cfg.bottom);
        // Boundary LEFT/TOP edges are the oppositeOf the boundary vertex's edge.
        if (col === 0) {
          expect(horizontalEdges[row][0]).toBe(oppositeOf(cfg.left));
        }
        if (row === 0) {
          expect(verticalEdges[0][col]).toBe(oppositeOf(cfg.top));
        }
      }
    }
  });
});
