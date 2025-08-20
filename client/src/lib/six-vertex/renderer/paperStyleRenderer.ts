/**
 * Paper-style renderer that creates the exact visual patterns from Figures 2 & 3
 * This renderer follows the actual arrow configurations to draw bold paths
 */

import type { LatticeState } from '../types';
import { EdgeState, VertexType } from '../types';

/**
 * Render in the exact style of the paper's Figures 2 and 3
 * Bold lines connect edges where arrows create continuous flow
 */
export function renderPaperStyle(
  ctx: CanvasRenderingContext2D,
  state: LatticeState,
  cellSize: number,
): void {
  // Clear canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Set up drawing style for bold paths
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = cellSize / 8;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  // Draw grid first (thin lines)
  ctx.save();
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;

  // Vertical grid lines
  for (let col = 0; col <= state.width; col++) {
    ctx.beginPath();
    ctx.moveTo((col + 1) * cellSize, cellSize);
    ctx.lineTo((col + 1) * cellSize, (state.height + 1) * cellSize);
    ctx.stroke();
  }

  // Horizontal grid lines
  for (let row = 0; row <= state.height; row++) {
    ctx.beginPath();
    ctx.moveTo(cellSize, (row + 1) * cellSize);
    ctx.lineTo((state.width + 1) * cellSize, (row + 1) * cellSize);
    ctx.stroke();
  }

  ctx.restore();

  // Now draw the bold paths based on vertex types
  // According to the C code analysis:
  // - a1: cross pattern (both H and V bold)
  // - a2: no bold edges
  // - b1: vertical bold only
  // - b2: horizontal bold only
  // - c1: L-shape left-bottom
  // - c2: L-shape top-right

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = cellSize / 8;

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];
      const cx = (col + 1) * cellSize;
      const cy = (row + 1) * cellSize;
      const half = cellSize / 2;

      switch (vertex.type) {
        case VertexType.a1:
          // Cross pattern - both horizontal and vertical bold
          ctx.beginPath();
          ctx.moveTo(cx - half, cy);
          ctx.lineTo(cx + half, cy);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cx, cy - half);
          ctx.lineTo(cx, cy + half);
          ctx.stroke();
          break;

        case VertexType.a2:
          // No bold edges
          break;

        case VertexType.b1:
          // Vertical bold only
          ctx.beginPath();
          ctx.moveTo(cx, cy - half);
          ctx.lineTo(cx, cy + half);
          ctx.stroke();
          break;

        case VertexType.b2:
          // Horizontal bold only
          ctx.beginPath();
          ctx.moveTo(cx - half, cy);
          ctx.lineTo(cx + half, cy);
          ctx.stroke();
          break;

        case VertexType.c1:
          // L-shape: left and bottom bold
          ctx.beginPath();
          ctx.moveTo(cx - half, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + half);
          ctx.stroke();
          break;

        case VertexType.c2:
          // L-shape: top and right bold
          ctx.beginPath();
          ctx.moveTo(cx, cy - half);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx + half, cy);
          ctx.stroke();
          break;
      }
    }
  }

  // Add vertex dots for clarity (optional)
  ctx.fillStyle = '#666666';
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const cx = (col + 1) * cellSize;
      const cy = (row + 1) * cellSize;

      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Alternative renderer that draws continuous paths by following edges
 */
export function renderContinuousPathsPaper(
  ctx: CanvasRenderingContext2D,
  state: LatticeState,
  cellSize: number,
): void {
  // Clear canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw light grid
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;

  for (let i = 0; i <= state.height; i++) {
    ctx.beginPath();
    ctx.moveTo(cellSize, (i + 1) * cellSize);
    ctx.lineTo((state.width + 1) * cellSize, (i + 1) * cellSize);
    ctx.stroke();
  }

  for (let j = 0; j <= state.width; j++) {
    ctx.beginPath();
    ctx.moveTo((j + 1) * cellSize, cellSize);
    ctx.lineTo((j + 1) * cellSize, (state.height + 1) * cellSize);
    ctx.stroke();
  }

  // Set up for bold paths
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = cellSize / 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw paths by connecting bold edges across vertices
  const drawnSegments = new Set<string>();

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];
      const cx = (col + 1) * cellSize;
      const cy = (row + 1) * cellSize;
      const offset = cellSize / 2;

      // Helper to create unique segment key
      const segmentKey = (x1: number, y1: number, x2: number, y2: number) =>
        `${Math.min(x1, x2)},${Math.min(y1, y2)}-${Math.max(x1, x2)},${Math.max(y1, y2)}`;

      // Draw based on vertex type
      switch (vertex.type) {
        case VertexType.a1: {
          // Cross - both paths
          const hKey = segmentKey(cx - offset, cy, cx + offset, cy);
          const vKey = segmentKey(cx, cy - offset, cx, cy + offset);

          if (!drawnSegments.has(hKey)) {
            ctx.beginPath();
            ctx.moveTo(cx - offset, cy);
            ctx.lineTo(cx + offset, cy);
            ctx.stroke();
            drawnSegments.add(hKey);
          }

          if (!drawnSegments.has(vKey)) {
            ctx.beginPath();
            ctx.moveTo(cx, cy - offset);
            ctx.lineTo(cx, cy + offset);
            ctx.stroke();
            drawnSegments.add(vKey);
          }
          break;
        }

        case VertexType.b1: {
          // Vertical only
          const key = segmentKey(cx, cy - offset, cx, cy + offset);
          if (!drawnSegments.has(key)) {
            ctx.beginPath();
            ctx.moveTo(cx, cy - offset);
            ctx.lineTo(cx, cy + offset);
            ctx.stroke();
            drawnSegments.add(key);
          }
          break;
        }

        case VertexType.b2: {
          // Horizontal only
          const key = segmentKey(cx - offset, cy, cx + offset, cy);
          if (!drawnSegments.has(key)) {
            ctx.beginPath();
            ctx.moveTo(cx - offset, cy);
            ctx.lineTo(cx + offset, cy);
            ctx.stroke();
            drawnSegments.add(key);
          }
          break;
        }

        case VertexType.c1: {
          // L-shape: left-bottom
          ctx.beginPath();
          ctx.moveTo(cx - offset, cy);
          ctx.quadraticCurveTo(cx, cy, cx, cy + offset);
          ctx.stroke();
          break;
        }

        case VertexType.c2: {
          // L-shape: top-right
          ctx.beginPath();
          ctx.moveTo(cx, cy - offset);
          ctx.quadraticCurveTo(cx, cy, cx + offset, cy);
          ctx.stroke();
          break;
        }

        case VertexType.a2:
          // No bold paths
          break;
      }
    }
  }
}
