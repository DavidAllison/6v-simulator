/**
 * Continuous path renderer that matches the paper's visualization style
 * Creates flowing paths through the lattice based on vertex connections
 */

import type { LatticeState, VertexType } from '../types';
import { EdgeState } from '../types';
import { EdgeDirection } from '../types';
import { getPathSegments } from '../vertexShapes';
import { renderPaperStyle } from './paperStyleRenderer';

interface Point {
  x: number;
  y: number;
}

interface Edge {
  row: number;
  col: number;
  type: 'horizontal' | 'vertical';
}

/**
 * Render continuous paths through the lattice (paper style)
 */
export function renderContinuousPaths(
  ctx: CanvasRenderingContext2D,
  state: LatticeState,
  cellSize: number,
): void {
  // Use the new paper-style renderer
  renderPaperStyle(ctx, state, cellSize);
}

/**
 * Draw a path segment in paper style - continuous across cell boundaries
 */
function drawPathSegmentPaperStyle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  from: EdgeDirection,
  to: EdgeDirection,
  cellSize: number,
): void {
  const offset = cellSize / 2;

  // Get edge points that extend to cell boundaries
  const fromPoint = getEdgePointExtended(cx, cy, from, offset);
  const toPoint = getEdgePointExtended(cx, cy, to, offset);

  ctx.beginPath();

  // Check if it's a straight path or curved
  if (isOppositeEdges(from, to)) {
    // Straight line through vertex
    ctx.moveTo(fromPoint.x, fromPoint.y);
    ctx.lineTo(toPoint.x, toPoint.y);
  } else {
    // Curved path that turns at vertex
    ctx.moveTo(fromPoint.x, fromPoint.y);
    // Use quadratic curve through vertex center for smooth turn
    ctx.quadraticCurveTo(cx, cy, toPoint.x, toPoint.y);
  }

  ctx.stroke();
}

/**
 * Get edge point that extends to cell boundary (for continuous paths)
 */
function getEdgePointExtended(
  cx: number,
  cy: number,
  direction: EdgeDirection,
  offset: number,
): Point {
  switch (direction) {
    case EdgeDirection.Left:
      return { x: cx - offset, y: cy };
    case EdgeDirection.Right:
      return { x: cx + offset, y: cy };
    case EdgeDirection.Top:
      return { x: cx, y: cy - offset };
    case EdgeDirection.Bottom:
      return { x: cx, y: cy + offset };
    default:
      return { x: cx, y: cy };
  }
}

/**
 * Check if two edges are opposite (form a straight line)
 */
function isOppositeEdges(edge1: EdgeDirection, edge2: EdgeDirection): boolean {
  return (
    (edge1 === EdgeDirection.Left && edge2 === EdgeDirection.Right) ||
    (edge1 === EdgeDirection.Right && edge2 === EdgeDirection.Left) ||
    (edge1 === EdgeDirection.Top && edge2 === EdgeDirection.Bottom) ||
    (edge1 === EdgeDirection.Bottom && edge2 === EdgeDirection.Top)
  );
}

/**
 * Create a visual pattern matching the paper's Figure 2 (DWBC High)
 * This shows the characteristic anti-diagonal pattern
 */
export function verifyDWBCHighPattern(
  ctx: CanvasRenderingContext2D,
  state: LatticeState,
  cellSize: number,
): void {
  // Clear and set up
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw background grid lightly
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

  // Draw the continuous paths
  renderContinuousPaths(ctx, state, cellSize);

  // Add labels for vertex types if helpful
  if (cellSize > 20) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < state.height; row++) {
      for (let col = 0; col < state.width; col++) {
        const vertex = state.vertices[row][col];
        const cx = (col + 1) * cellSize;
        const cy = (row + 1) * cellSize;

        // Draw small vertex type label
        ctx.fillText(vertex.type, cx, cy - cellSize / 3);
      }
    }
  }
}

/**
 * Create a visual pattern matching the paper's Figure 3 (DWBC Low)
 * This shows the characteristic main diagonal pattern
 */
export function verifyDWBCLowPattern(
  ctx: CanvasRenderingContext2D,
  state: LatticeState,
  cellSize: number,
): void {
  // Same as High but will show different pattern due to vertex arrangement
  verifyDWBCHighPattern(ctx, state, cellSize);
}
