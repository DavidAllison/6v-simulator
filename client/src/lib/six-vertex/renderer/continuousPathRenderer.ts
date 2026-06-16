/**
 * Continuous path renderer that matches the paper's visualization style
 * Creates flowing paths through the lattice based on vertex connections
 */

import type { LatticeState } from '../types';
import { renderPaperStyle, type PaperStyleColors } from './paperStyleRenderer';

/**
 * Render continuous paths through the lattice (paper style)
 */
export function renderContinuousPaths(
  ctx: CanvasRenderingContext2D,
  state: LatticeState,
  cellSize: number,
  colors?: PaperStyleColors,
): void {
  // Use the new paper-style renderer
  renderPaperStyle(ctx, state, cellSize, colors);
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
