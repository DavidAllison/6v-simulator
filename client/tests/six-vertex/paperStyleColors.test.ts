import { describe, it, expect } from '@jest/globals';
import { renderPaperStyle } from '../../src/lib/six-vertex/renderer/paperStyleRenderer';
import { getVertexConfiguration, VertexType } from '../../src/lib/six-vertex/types';
import type { LatticeState, Vertex } from '../../src/lib/six-vertex/types';

// Minimal recording 2D context — jsdom has no real canvas, and we only need to
// observe which colors the renderer assigns. Records every strokeStyle/fillStyle
// the renderer sets.
function makeRecordingCtx() {
  const strokeStyles: string[] = [];
  const fillStyles: string[] = [];
  let _stroke = '';
  let _fill = '';
  const ctx = {
    canvas: { width: 200, height: 200 },
    set strokeStyle(v: string) {
      _stroke = v;
      strokeStyles.push(v);
    },
    get strokeStyle() {
      return _stroke;
    },
    set fillStyle(v: string) {
      _fill = v;
      fillStyles.push(v);
    },
    get fillStyle() {
      return _fill;
    },
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    clearRect() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
    save() {},
    restore() {},
  };
  return { ctx, strokeStyles, fillStyles };
}

function tinyLattice(): LatticeState {
  const types = [VertexType.a1, VertexType.c2, VertexType.b1, VertexType.c1];
  const vertices: Vertex[][] = [];
  let i = 0;
  for (let r = 0; r < 2; r++) {
    const row: Vertex[] = [];
    for (let c = 0; c < 2; c++) {
      const type = types[i++ % types.length];
      row.push({ position: { row: r, col: c }, type, configuration: getVertexConfiguration(type) });
    }
    vertices.push(row);
  }
  return { width: 2, height: 2, vertices, horizontalEdges: [], verticalEdges: [] };
}

describe('renderPaperStyle honors theme colors (#69 dark mode)', () => {
  it('uses the supplied pathSegment, grid, and background colors', () => {
    const { ctx, strokeStyles, fillStyles } = makeRecordingCtx();
    renderPaperStyle(ctx as unknown as CanvasRenderingContext2D, tinyLattice(), 20, {
      background: '#1a1a1a',
      grid: '#404040',
      pathSegment: '#e0e0e0',
    });
    // Bold paths must be drawn in the dark-mode path color, not hardcoded black.
    expect(strokeStyles).toContain('#e0e0e0');
    expect(strokeStyles).toContain('#404040');
    expect(strokeStyles).not.toContain('#000000');
    // Themed background must be painted (not left transparent).
    expect(fillStyles).toContain('#1a1a1a');
  });

  it('falls back to light defaults when no colors are supplied', () => {
    const { ctx, strokeStyles } = makeRecordingCtx();
    renderPaperStyle(ctx as unknown as CanvasRenderingContext2D, tinyLattice(), 20);
    expect(strokeStyles).toContain('#000000');
  });
});
