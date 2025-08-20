/**
 * Rendering and visualization tests
 * Ensures correct visual representation of the 6-vertex model
 */

import { PathRenderer } from '../../src/lib/six-vertex/renderer/pathRenderer';
import { generateDWBCHigh, generateDWBCLow } from '../../src/lib/six-vertex/initialStates';
import { VertexType, LatticeState } from '../../src/lib/six-vertex/types';
import { getVertexPathData, getVertexASCII } from '../../src/lib/six-vertex/vertexShapes';

// Mock canvas for testing
class MockCanvas {
  width: number = 400;
  height: number = 400;
  private context: MockCanvasContext;

  constructor() {
    this.context = new MockCanvasContext();
  }

  getContext(type: string): MockCanvasContext | null {
    if (type === '2d') {
      return this.context;
    }
    return null;
  }

  getDrawCalls() {
    return this.context.getDrawCalls();
  }
}

class MockCanvasContext {
  private drawCalls: any[] = [];

  fillStyle: string = '#000000';
  strokeStyle: string = '#000000';
  lineWidth: number = 1;
  globalAlpha: number = 1;
  font: string = '12px sans-serif';
  textAlign: string = 'left';
  textBaseline: string = 'alphabetic';

  save() {
    this.drawCalls.push({ type: 'save' });
  }

  restore() {
    this.drawCalls.push({ type: 'restore' });
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

  getDrawCalls() {
    return this.drawCalls;
  }

  reset() {
    this.drawCalls = [];
  }
}

describe('Rendering Tests', () => {
  describe('PathRenderer Initialization', () => {
    it('should initialize with canvas', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);

      expect(renderer).toBeDefined();
    });

    it('should handle null context gracefully', () => {
      const badCanvas = {
        getContext: () => null,
      } as unknown as HTMLCanvasElement;

      expect(() => new PathRenderer(badCanvas)).not.toThrow();
    });

    it('should set default properties', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);

      // Should have default settings
      expect(() => renderer.render(generateDWBCHigh(4))).not.toThrow();
    });
  });

  describe('Render Modes', () => {
    it('should render in paths mode', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(4);

      renderer.setRenderMode('paths');
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should have draw calls
      expect(drawCalls.length).toBeGreaterThan(0);

      // Should clear canvas first
      expect(drawCalls[0].type).toBe('clearRect');

      // Should draw paths
      const pathCalls = drawCalls.filter((c: any) => c.type === 'stroke');
      expect(pathCalls.length).toBeGreaterThan(0);
    });

    it('should render in vertices mode', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(4);

      renderer.setRenderMode('vertices');
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should draw vertex indicators
      const arcCalls = drawCalls.filter((c: any) => c.type === 'arc');
      expect(arcCalls.length).toBeGreaterThan(0);
    });

    it('should render in arrows mode', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(4);

      renderer.setRenderMode('arrows');
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should draw arrows
      const lineCalls = drawCalls.filter((c: any) => c.type === 'lineTo');
      expect(lineCalls.length).toBeGreaterThan(0);
    });

    it('should render in height mode', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(4);

      renderer.setRenderMode('height');
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should use colors for height visualization
      const fillCalls = drawCalls.filter((c: any) => c.type === 'fillRect');
      expect(fillCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Zoom and Pan', () => {
    it('should apply zoom transformation', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(4);

      renderer.setZoom(2.0);
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should have scale transformation
      const scaleCalls = drawCalls.filter((c: any) => c.type === 'scale');
      expect(scaleCalls.length).toBeGreaterThan(0);
      expect(scaleCalls[0].x).toBe(2.0);
      expect(scaleCalls[0].y).toBe(2.0);
    });

    it('should apply pan transformation', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(4);

      renderer.setPan(50, -30);
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should have translate transformation
      const translateCalls = drawCalls.filter((c: any) => c.type === 'translate');
      expect(translateCalls.length).toBeGreaterThan(0);

      // Should include pan offset
      const hasPanOffset = translateCalls.some(
        (c: any) => Math.abs(c.x - 50) < 1 || Math.abs(c.y + 30) < 1,
      );
      expect(hasPanOffset).toBe(true);
    });

    it('should reset view correctly', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(4);

      // Apply transformations
      renderer.setZoom(3.0);
      renderer.setPan(100, 100);

      // Reset
      renderer.resetView();
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should have default scale (1.0)
      const scaleCalls = drawCalls.filter((c: any) => c.type === 'scale');
      if (scaleCalls.length > 0) {
        expect(scaleCalls[0].x).toBe(1.0);
        expect(scaleCalls[0].y).toBe(1.0);
      }
    });

    it('should handle zoom limits', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);

      // Try extreme zoom values
      renderer.setZoom(0.01);
      expect(() => renderer.render(generateDWBCHigh(4))).not.toThrow();

      renderer.setZoom(100);
      expect(() => renderer.render(generateDWBCHigh(4))).not.toThrow();
    });
  });

  describe('Flippable Highlighting', () => {
    it('should highlight flippable positions when enabled', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(4);

      renderer.setShowFlippable(true);
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should have additional highlighting draws
      expect(drawCalls.length).toBeGreaterThan(0);
    });

    it('should not highlight when disabled', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(4);

      renderer.setShowFlippable(false);
      renderer.render(state);

      const drawCalls1 = (canvas as any).getDrawCalls();

      // Reset and render with highlighting
      (canvas as any).context.reset();
      renderer.setShowFlippable(true);
      renderer.render(state);

      const drawCalls2 = (canvas as any).getDrawCalls();

      // Should have different number of draw calls
      expect(drawCalls2.length).not.toBe(drawCalls1.length);
    });
  });

  describe('Vertex Path Data Generation', () => {
    it('should generate correct path data for each vertex type', () => {
      const cellSize = 20;
      const vertexTypes = [
        VertexType.a1,
        VertexType.a2,
        VertexType.b1,
        VertexType.b2,
        VertexType.c1,
        VertexType.c2,
      ];

      for (const type of vertexTypes) {
        const { paths, arrows } = getVertexPathData(type, cellSize);

        // Should have 2 paths (ice rule: 2 paths through vertex)
        expect(paths).toHaveLength(2);

        // Should have 2 arrows
        expect(arrows).toHaveLength(2);

        // Paths should be valid SVG path strings
        for (const path of paths) {
          expect(path).toMatch(/^M/); // Should start with Move command
        }

        // Arrows should have valid coordinates
        for (const arrow of arrows) {
          expect(arrow.from).toHaveLength(2);
          expect(arrow.to).toHaveLength(2);
          expect(typeof arrow.from[0]).toBe('number');
          expect(typeof arrow.from[1]).toBe('number');
        }
      }
    });

    it('should generate straight paths for opposite edges', () => {
      const cellSize = 20;

      // a1 and a2 have straight-through paths
      const a1Data = getVertexPathData(VertexType.a1, cellSize);
      const a2Data = getVertexPathData(VertexType.a2, cellSize);

      // Should use line commands (L) for straight paths
      for (const path of a1Data.paths) {
        expect(path).toContain(' L ');
      }

      for (const path of a2Data.paths) {
        expect(path).toContain(' L ');
      }
    });

    it('should generate curved paths for adjacent edges', () => {
      const cellSize = 20;

      // b and c types have turning paths
      const b1Data = getVertexPathData(VertexType.b1, cellSize);
      const c1Data = getVertexPathData(VertexType.c1, cellSize);

      // Should use quadratic curve commands (Q) for turns
      for (const path of b1Data.paths) {
        expect(path).toContain(' Q ');
      }

      for (const path of c1Data.paths) {
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

        // Should be 3x5 character grid
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
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(4);

      renderer.setRenderMode('vertices');
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should set fill styles for different vertex types
      const fillStyleCalls = drawCalls.filter((c: any) => c.fillStyle);
      expect(fillStyleCalls.length).toBeGreaterThan(0);
    });

    it('should use gradient for height visualization', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(4);

      renderer.setRenderMode('height');
      renderer.render(state);

      const drawCalls = (canvas as any).getDrawCalls();

      // Should use different colors for different heights
      const fillRectCalls = drawCalls.filter((c: any) => c.type === 'fillRect');
      const uniqueColors = new Set(fillRectCalls.map((c: any) => c.fillStyle));

      // Should have multiple colors for height gradient
      expect(uniqueColors.size).toBeGreaterThan(1);
    });
  });

  describe('Performance', () => {
    it('should render small lattices quickly', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(8);

      const startTime = performance.now();
      renderer.render(state);
      const endTime = performance.now();

      // Should render in less than 50ms
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle large lattices', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(32);

      const startTime = performance.now();
      renderer.render(state);
      const endTime = performance.now();

      // Should render in less than 200ms even for large lattices
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should not accumulate memory over multiple renders', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(8);

      // Render many times
      for (let i = 0; i < 100; i++) {
        renderer.render(state);

        // Clear draw calls to prevent accumulation in mock
        (canvas as any).context.reset();
      }

      // Should not throw or leak memory
      expect(() => renderer.render(state)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty state', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);

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
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(1);

      expect(() => renderer.render(state)).not.toThrow();
    });

    it('should handle very small canvas', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      canvas.width = 10;
      canvas.height = 10;

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(8);

      expect(() => renderer.render(state)).not.toThrow();
    });

    it('should handle very large canvas', () => {
      const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
      canvas.width = 10000;
      canvas.height = 10000;

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(4);

      expect(() => renderer.render(state)).not.toThrow();
    });
  });
});
