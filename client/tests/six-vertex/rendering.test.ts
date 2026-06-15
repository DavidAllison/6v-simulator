/**
 * Rendering and visualization tests
 * Ensures correct visual representation of the 6-vertex model
 */

import { PathRenderer } from '../../src/lib/six-vertex/renderer/pathRenderer';
import { generateDWBCHigh, generateDWBCLow } from '../../src/lib/six-vertex/initialStates';
import { VertexType, RenderMode, LatticeState } from '../../src/lib/six-vertex/types';
import { getVertexPathData, getVertexASCII } from '../../src/lib/six-vertex/vertexShapes';

interface DrawCall {
  type: string;
  [key: string]: unknown;
}

// Mock canvas for testing (jsdom's canvas has no real 2D context)
class MockCanvas {
  width: number = 400;
  height: number = 400;
  context: MockCanvasContext;

  constructor() {
    this.context = new MockCanvasContext(this);
  }

  getContext(type: string): MockCanvasContext | null {
    if (type === '2d') {
      return this.context;
    }
    return null;
  }

  getDrawCalls(): DrawCall[] {
    return this.context.getDrawCalls();
  }
}

class MockCanvasContext {
  private drawCalls: DrawCall[] = [];

  // Back-reference so renderers that read ctx.canvas.{width,height} work
  canvas: MockCanvas;

  fillStyle: string = '#000000';
  strokeStyle: string = '#000000';
  lineWidth: number = 1;
  globalAlpha: number = 1;
  font: string = '12px sans-serif';
  textAlign: string = 'left';
  textBaseline: string = 'alphabetic';
  lineCap: string = 'butt';
  lineJoin: string = 'miter';

  constructor(canvas: MockCanvas) {
    this.canvas = canvas;
  }

  save() {
    this.drawCalls.push({ type: 'save' });
  }

  restore() {
    this.drawCalls.push({ type: 'restore' });
  }

  setLineDash(_segments: number[]) {
    this.drawCalls.push({ type: 'setLineDash' });
  }

  clearRect(x: number, y: number, width: number, height: number) {
    this.drawCalls.push({ type: 'clearRect', x, y, width, height });
  }

  fillRect(x: number, y: number, width: number, height: number) {
    this.drawCalls.push({ type: 'fillRect', x, y, width, height, fillStyle: this.fillStyle });
  }

  strokeRect(x: number, y: number, width: number, height: number) {
    this.drawCalls.push({ type: 'strokeRect', x, y, width, height, strokeStyle: this.strokeStyle });
  }

  beginPath() {
    this.drawCalls.push({ type: 'beginPath' });
  }

  closePath() {
    this.drawCalls.push({ type: 'closePath' });
  }

  moveTo(x: number, y: number) {
    this.drawCalls.push({ type: 'moveTo', x, y });
  }

  lineTo(x: number, y: number) {
    this.drawCalls.push({ type: 'lineTo', x, y });
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.drawCalls.push({ type: 'quadraticCurveTo', cpx, cpy, x, y });
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    this.drawCalls.push({ type: 'arc', x, y, radius, startAngle, endAngle });
  }

  fill() {
    this.drawCalls.push({ type: 'fill', fillStyle: this.fillStyle });
  }

  stroke() {
    this.drawCalls.push({
      type: 'stroke',
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
    });
  }

  fillText(text: string, x: number, y: number) {
    this.drawCalls.push({ type: 'fillText', text, x, y, font: this.font });
  }

  translate(x: number, y: number) {
    this.drawCalls.push({ type: 'translate', x, y });
  }

  scale(x: number, y: number) {
    this.drawCalls.push({ type: 'scale', x, y });
  }

  getDrawCalls(): DrawCall[] {
    return this.drawCalls;
  }

  reset() {
    this.drawCalls = [];
  }
}

function makeRenderer(config?: Parameters<typeof PathRenderer.prototype.updateConfig>[0]) {
  const canvas = new MockCanvas();
  const renderer = new PathRenderer(canvas as unknown as HTMLCanvasElement, config);
  return { canvas, renderer };
}

describe('Rendering Tests', () => {
  describe('PathRenderer Initialization', () => {
    it('should initialize with canvas', () => {
      const { renderer } = makeRenderer();
      expect(renderer).toBeDefined();
    });

    it('should throw when 2D context is unavailable', () => {
      const badCanvas = {
        getContext: () => null,
      } as unknown as HTMLCanvasElement;

      // PathRenderer requires a 2D context and throws if it cannot be obtained.
      expect(() => new PathRenderer(badCanvas)).toThrow();
    });

    it('should render with default config without throwing', () => {
      const { renderer } = makeRenderer();
      expect(() => renderer.render(generateDWBCHigh(4))).not.toThrow();
    });

    it('should accept config overrides via constructor', () => {
      const { canvas, renderer } = makeRenderer({ mode: RenderMode.Vertices });
      renderer.render(generateDWBCLow(4));

      // Vertices mode draws vertex point markers using arc().
      const arcCalls = canvas.getDrawCalls().filter((c) => c.type === 'arc');
      expect(arcCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Render Modes', () => {
    it('should render in paths mode', () => {
      const { canvas, renderer } = makeRenderer({ mode: RenderMode.Paths });
      renderer.render(generateDWBCHigh(4));

      const drawCalls = canvas.getDrawCalls();

      // Should have draw calls
      expect(drawCalls.length).toBeGreaterThan(0);

      // Should clear canvas first
      expect(drawCalls[0].type).toBe('clearRect');

      // Should draw paths (stroked lines)
      const pathCalls = drawCalls.filter((c) => c.type === 'stroke');
      expect(pathCalls.length).toBeGreaterThan(0);
    });

    it('should render in vertices mode', () => {
      const { canvas, renderer } = makeRenderer({ mode: RenderMode.Vertices });
      renderer.render(generateDWBCLow(4));

      const drawCalls = canvas.getDrawCalls();

      // Vertices mode color-codes each vertex with a filled square.
      const fillRectCalls = drawCalls.filter((c) => c.type === 'fillRect');
      expect(fillRectCalls.length).toBeGreaterThan(0);

      // It also labels each vertex with its type.
      const textCalls = drawCalls.filter((c) => c.type === 'fillText');
      expect(textCalls.length).toBeGreaterThan(0);
    });

    it('should render in arrows mode', () => {
      const { canvas, renderer } = makeRenderer({ mode: RenderMode.Arrows });
      renderer.render(generateDWBCLow(4));

      const drawCalls = canvas.getDrawCalls();

      // Arrows are drawn as line segments with arrowheads.
      const lineCalls = drawCalls.filter((c) => c.type === 'lineTo');
      expect(lineCalls.length).toBeGreaterThan(0);
    });

    it('should render in both mode (paths + arrows)', () => {
      const { canvas, renderer } = makeRenderer({ mode: RenderMode.Both });
      renderer.render(generateDWBCHigh(4));

      const drawCalls = canvas.getDrawCalls();

      // Both mode should produce stroked paths and arrow lines.
      const strokeCalls = drawCalls.filter((c) => c.type === 'stroke');
      const lineCalls = drawCalls.filter((c) => c.type === 'lineTo');
      expect(strokeCalls.length).toBeGreaterThan(0);
      expect(lineCalls.length).toBeGreaterThan(0);
    });

    it('should switch render modes via updateConfig', () => {
      const { canvas, renderer } = makeRenderer({ mode: RenderMode.Paths });

      renderer.render(generateDWBCHigh(4));
      const pathsHasFillRect = canvas
        .getDrawCalls()
        .some((c) => c.type === 'fillRect' && c.width !== canvas.width);

      canvas.context.reset();
      renderer.updateConfig({ mode: RenderMode.Vertices });
      renderer.render(generateDWBCHigh(4));
      const verticesFillRects = canvas.getDrawCalls().filter((c) => c.type === 'fillRect');

      // Vertices mode draws per-vertex squares; paths mode does not.
      expect(verticesFillRects.length).toBeGreaterThan(0);
      expect(pathsHasFillRect).toBe(false);
    });
  });

  describe('Grid Display', () => {
    it('should draw grid when showGrid is enabled', () => {
      const { canvas, renderer } = makeRenderer({ mode: RenderMode.Paths, showGrid: true });
      renderer.render(generateDWBCHigh(4));

      // Grid drawing toggles line dashing.
      const dashCalls = canvas.getDrawCalls().filter((c) => c.type === 'setLineDash');
      expect(dashCalls.length).toBeGreaterThan(0);
    });

    it('should produce fewer draws when grid is disabled', () => {
      const { canvas: gridCanvas, renderer: gridRenderer } = makeRenderer({
        mode: RenderMode.Paths,
        showGrid: true,
      });
      gridRenderer.render(generateDWBCHigh(4));
      const withGrid = gridCanvas.getDrawCalls().length;

      const { canvas: plainCanvas, renderer: plainRenderer } = makeRenderer({
        mode: RenderMode.Paths,
        showGrid: false,
      });
      plainRenderer.render(generateDWBCHigh(4));
      const withoutGrid = plainCanvas.getDrawCalls().length;

      expect(withoutGrid).toBeLessThan(withGrid);
    });
  });

  describe('Canvas Sizing', () => {
    it('should size the canvas based on lattice dimensions and cell size', () => {
      const cellSize = 30;
      const { canvas, renderer } = makeRenderer({ cellSize });
      const state = generateDWBCHigh(4);
      renderer.render(state);

      const { width, height } = renderer.getDimensions();
      expect(width).toBe((state.width + 1) * cellSize);
      expect(height).toBe((state.height + 1) * cellSize);
      expect(canvas.width).toBe(width);
    });
  });

  describe('Vertex Path Data Generation', () => {
    // Number of bold path segments per vertex type, matching getPathSegments
    // (main.c draw_vertex semantics): a1 has both straight paths, a2 has none,
    // the b/c types each have a single path.
    const expectedSegmentCount: Record<VertexType, number> = {
      [VertexType.a1]: 2,
      [VertexType.a2]: 0,
      [VertexType.b1]: 1,
      [VertexType.b2]: 1,
      [VertexType.c1]: 1,
      [VertexType.c2]: 1,
    };

    it('should generate path data matching the segment count for each vertex type', () => {
      const cellSize = 20;

      for (const type of Object.keys(expectedSegmentCount) as VertexType[]) {
        const { paths, arrows } = getVertexPathData(type, cellSize);
        const expected = expectedSegmentCount[type];

        // One SVG path + one arrow per bold segment.
        expect(paths).toHaveLength(expected);
        expect(arrows).toHaveLength(expected);

        // Paths should be valid SVG path strings.
        for (const path of paths) {
          expect(path).toMatch(/^M/); // Should start with Move command
        }

        // Arrows should have valid coordinates.
        for (const arrow of arrows) {
          expect(arrow.from).toHaveLength(2);
          expect(arrow.to).toHaveLength(2);
          expect(typeof arrow.from[0]).toBe('number');
          expect(typeof arrow.from[1]).toBe('number');
        }
      }
    });

    it('should generate straight (L) paths for opposite edges', () => {
      const cellSize = 20;

      // a1 (both axes), b1 (vertical) and b2 (horizontal) are straight-through.
      const straightTypes = [VertexType.a1, VertexType.b1, VertexType.b2];

      for (const type of straightTypes) {
        const { paths } = getVertexPathData(type, cellSize);
        expect(paths.length).toBeGreaterThan(0);
        for (const path of paths) {
          expect(path).toContain(' L ');
          expect(path).not.toContain(' Q ');
        }
      }
    });

    it('should generate curved (Q) paths for adjacent (turning) edges', () => {
      const cellSize = 20;

      // c1 (left→bottom) and c2 (top→right) are L-shaped turns.
      const c1Data = getVertexPathData(VertexType.c1, cellSize);
      const c2Data = getVertexPathData(VertexType.c2, cellSize);

      for (const path of [...c1Data.paths, ...c2Data.paths]) {
        expect(path).toContain(' Q ');
      }
    });
  });

  describe('ASCII Rendering', () => {
    it('should generate ASCII representation for each vertex type', () => {
      const vertexTypes = [
        VertexType.a1,
        VertexType.a2,
        VertexType.b1,
        VertexType.b2,
        VertexType.c1,
        VertexType.c2,
      ];

      for (const type of vertexTypes) {
        const ascii = getVertexASCII(type);

        // Should be 3 rows of 5 characters
        expect(ascii).toHaveLength(3);
        expect(ascii[0]).toHaveLength(5);
        expect(ascii[1]).toHaveLength(5);
        expect(ascii[2]).toHaveLength(5);

        // Should have center marker
        expect(ascii[1]).toContain('○');
      }
    });

    it('should show different patterns for different vertex types', () => {
      const a1ASCII = getVertexASCII(VertexType.a1);
      const b1ASCII = getVertexASCII(VertexType.b1);
      const c1ASCII = getVertexASCII(VertexType.c1);

      // Different types should have different ASCII patterns
      expect(a1ASCII).not.toEqual(b1ASCII);
      expect(b1ASCII).not.toEqual(c1ASCII);
      expect(a1ASCII).not.toEqual(c1ASCII);
    });
  });

  describe('Color Schemes', () => {
    it('should use appropriate colors for vertex types', () => {
      const { canvas, renderer } = makeRenderer({ mode: RenderMode.Vertices });
      renderer.render(generateDWBCHigh(4));

      const drawCalls = canvas.getDrawCalls();

      // Should set fill styles while drawing vertices.
      const fillStyleCalls = drawCalls.filter((c) => c.fillStyle);
      expect(fillStyleCalls.length).toBeGreaterThan(0);
    });

    it('should use multiple vertex colors for a mixed lattice', () => {
      const { canvas, renderer } = makeRenderer({ mode: RenderMode.Vertices });
      renderer.render(generateDWBCLow(4));

      const drawCalls = canvas.getDrawCalls();

      // The per-vertex squares are filled; a DWBC lattice has several vertex
      // types, so more than one fill colour should appear.
      const fillRectCalls = drawCalls.filter((c) => c.type === 'fillRect');
      const uniqueColors = new Set(fillRectCalls.map((c) => c.fillStyle));
      expect(uniqueColors.size).toBeGreaterThan(1);
    });
  });

  describe('Performance', () => {
    it('should render small lattices quickly', () => {
      const { renderer } = makeRenderer();
      const state = generateDWBCHigh(8);

      const startTime = performance.now();
      renderer.render(state);
      const endTime = performance.now();

      // Should render in less than 50ms
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle large lattices', () => {
      const { renderer } = makeRenderer();
      const state = generateDWBCLow(32);

      const startTime = performance.now();
      renderer.render(state);
      const endTime = performance.now();

      // Should render in less than 200ms even for large lattices
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should not accumulate memory over multiple renders', () => {
      const { canvas, renderer } = makeRenderer();
      const state = generateDWBCHigh(8);

      // Render many times
      for (let i = 0; i < 100; i++) {
        renderer.render(state);
        // Clear draw calls to prevent accumulation in mock
        canvas.context.reset();
      }

      // Should not throw or leak memory
      expect(() => renderer.render(state)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty state', () => {
      const { renderer } = makeRenderer();

      const emptyState: LatticeState = {
        width: 0,
        height: 0,
        vertices: [],
        horizontalEdges: [],
        verticalEdges: [],
      };

      expect(() => renderer.render(emptyState)).not.toThrow();
    });

    it('should handle 1x1 lattice', () => {
      const { renderer } = makeRenderer();
      const state = generateDWBCHigh(1);

      expect(() => renderer.render(state)).not.toThrow();
    });

    it('should handle very small initial canvas', () => {
      const canvas = new MockCanvas();
      canvas.width = 10;
      canvas.height = 10;

      const renderer = new PathRenderer(canvas as unknown as HTMLCanvasElement);
      const state = generateDWBCHigh(8);

      expect(() => renderer.render(state)).not.toThrow();
    });

    it('should handle very large initial canvas', () => {
      const canvas = new MockCanvas();
      canvas.width = 10000;
      canvas.height = 10000;

      const renderer = new PathRenderer(canvas as unknown as HTMLCanvasElement);
      const state = generateDWBCLow(4);

      expect(() => renderer.render(state)).not.toThrow();
    });
  });
});
