/**
 * Canvas-based renderer for the 6-vertex model
 * Supports both path and arrow rendering modes
 */

import type { LatticeState, RenderConfig, Position } from '../types';
import { RenderMode, EdgeState, VertexType } from '../types';
import { renderContinuousPaths } from './continuousPathRenderer';
import { paintLatticeBitmap } from './latticeBitmap';

/**
 * Main renderer class for the 6-vertex model
 */
export class PathRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement, config?: Partial<RenderConfig>) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
    this.config = this.getDefaultConfig(config);
  }

  /**
   * Get default render configuration
   */
  private getDefaultConfig(overrides?: Partial<RenderConfig>): RenderConfig {
    return {
      mode: RenderMode.Paths,
      cellSize: 30,
      lineWidth: 2,
      colors: {
        background: '#ffffff',
        grid: '#e0e0e0',
        pathSegment: '#000000',
        arrow: '#4444ff',
        vertexTypes: {
          [VertexType.a1]: '#ff4444',
          [VertexType.a2]: '#44ff44',
          [VertexType.b1]: '#4444ff',
          [VertexType.b2]: '#ffff44',
          [VertexType.c1]: '#ff44ff',
          [VertexType.c2]: '#44ffff',
        },
      },
      showGrid: true,
      animateFlips: false,
      animationDuration: 300,
      ...overrides,
    };
  }

  /**
   * Update render configuration
   */
  updateConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Fast path for large lattices: paint one pixel per vertex (coloured by type)
   * from a flat typed array, sizing the canvas to the lattice. The enclosing
   * pan/zoom transform scales the bitmap up, so cost is bounded by vertex count
   * rather than on-screen pixels. Bypasses the per-cell path/grid drawing that
   * is infeasible at e.g. 1024x1024.
   */
  renderRaw(width: number, height: number, vertices: Int8Array): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.imageSmoothingEnabled = false;
    paintLatticeBitmap(this.ctx, width, height, vertices);
  }

  /**
   * Render the lattice state
   */
  render(state: LatticeState): void {
    // Clear canvas
    this.clear();

    // Set canvas size based on lattice
    const width = (state.width + 1) * this.config.cellSize;
    const height = (state.height + 1) * this.config.cellSize;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    // Draw background
    this.drawBackground();

    // Draw grid if enabled
    if (this.config.showGrid) {
      this.drawGrid(state);
    }

    // Draw based on render mode
    switch (this.config.mode) {
      case RenderMode.Paths:
        this.drawPaths(state);
        break;
      case RenderMode.Arrows:
        this.drawArrows(state);
        break;
      case RenderMode.Both:
        this.drawPaths(state);
        this.drawArrows(state);
        break;
      case RenderMode.Vertices:
        this.drawVertices(state);
        break;
    }
  }

  /**
   * Clear the canvas
   */
  private clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw background
   */
  private drawBackground(): void {
    this.ctx.fillStyle = this.config.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw the lattice grid
   */
  private drawGrid(state: LatticeState): void {
    this.ctx.strokeStyle = this.config.colors.grid;
    this.ctx.lineWidth = 0.5;
    this.ctx.setLineDash([2, 2]);

    // Draw horizontal lines
    for (let row = 0; row <= state.height; row++) {
      const y = row * this.config.cellSize + this.config.cellSize / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.config.cellSize / 2, y);
      this.ctx.lineTo(state.width * this.config.cellSize + this.config.cellSize / 2, y);
      this.ctx.stroke();
    }

    // Draw vertical lines
    for (let col = 0; col <= state.width; col++) {
      const x = col * this.config.cellSize + this.config.cellSize / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.config.cellSize / 2);
      this.ctx.lineTo(x, state.height * this.config.cellSize + this.config.cellSize / 2);
      this.ctx.stroke();
    }

    // Reset line dash
    this.ctx.setLineDash([]);

    // Draw vertex points
    this.ctx.fillStyle = this.config.colors.grid;
    for (let row = 0; row < state.height; row++) {
      for (let col = 0; col < state.width; col++) {
        const x = (col + 1) * this.config.cellSize;
        const y = (row + 1) * this.config.cellSize;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  /**
   * Draw paths (bold edges) - Paper style with continuous paths
   */
  private drawPaths(state: LatticeState): void {
    // Use the new continuous path renderer that matches the paper style.
    // Pass theme colors so paths/grid/background are legible in dark mode (#69).
    renderContinuousPaths(this.ctx, state, this.config.cellSize, {
      background: this.config.colors?.background,
      grid: this.config.colors?.grid,
      pathSegment: this.config.colors?.pathSegment,
    });
  }

  /**
   * Draw arrows showing the flow direction on every edge.
   *
   * Each arrow is drawn directly from a vertex's `configuration` (the
   * authoritative ice-rule in/out state, always present on both the standard and
   * optimized engines) as a half-edge from the vertex centre to the edge
   * midpoint. An `In` edge points toward the vertex; an `Out` edge points away.
   * Reading the configuration directly keeps the arrows correct and live as the
   * simulation steps, and avoids degenerate zero-length segments.
   */
  private drawArrows(state: LatticeState): void {
    // Use semi-transparent arrows when overlaying on paths
    this.ctx.strokeStyle =
      this.config.mode === RenderMode.Both
        ? `${this.config.colors.arrow}B3` // Add transparency
        : this.config.colors.arrow;
    this.ctx.fillStyle = this.ctx.strokeStyle;
    this.ctx.lineWidth = this.config.lineWidth;
    this.ctx.setLineDash([]);

    const cell = this.config.cellSize;
    const half = cell / 2;

    for (let row = 0; row < state.height; row++) {
      for (let col = 0; col < state.width; col++) {
        const { configuration } = state.vertices[row][col];
        const cx = (col + 1) * cell;
        const cy = (row + 1) * cell;

        // For each edge: Out points away from the vertex, In points toward it.
        // Right edge (horizontal, to the right of the vertex centre).
        if (configuration.right === EdgeState.Out) this.drawArrow(cx, cy, cx + half, cy);
        else this.drawArrow(cx + half, cy, cx, cy);

        // Left edge.
        if (configuration.left === EdgeState.Out) this.drawArrow(cx, cy, cx - half, cy);
        else this.drawArrow(cx - half, cy, cx, cy);

        // Top edge.
        if (configuration.top === EdgeState.Out) this.drawArrow(cx, cy, cx, cy - half);
        else this.drawArrow(cx, cy - half, cx, cy);

        // Bottom edge.
        if (configuration.bottom === EdgeState.Out) this.drawArrow(cx, cy, cx, cy + half);
        else this.drawArrow(cx, cy + half, cx, cy);
      }
    }
  }

  /**
   * Draw a single arrow
   */
  private drawArrow(x1: number, y1: number, x2: number, y2: number): void {
    const headLength = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    // Draw arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - headLength * Math.cos(angle - Math.PI / 6),
      y2 - headLength * Math.sin(angle - Math.PI / 6),
    );
    this.ctx.lineTo(
      x2 - headLength * Math.cos(angle + Math.PI / 6),
      y2 - headLength * Math.sin(angle + Math.PI / 6),
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Draw vertices with color coding
   */
  /**
   * Get edge pattern for a vertex type (which edges have paths passing through)
   * Based on paper Figure 1: edges are shaded where paths flow through them
   */
  private getEdgePattern(vertexType: VertexType): {
    left: boolean;
    top: boolean;
    right: boolean;
    bottom: boolean;
  } {
    const patterns = {
      [VertexType.a1]: { left: true, top: true, right: true, bottom: true }, // All edges (2 straight paths)
      [VertexType.a2]: { left: false, top: false, right: false, bottom: false }, // No edges shaded
      [VertexType.b1]: { left: false, top: true, right: false, bottom: true }, // Vertical path only
      [VertexType.b2]: { left: true, top: false, right: true, bottom: false }, // Horizontal path only
      [VertexType.c1]: { left: true, top: false, right: false, bottom: true }, // L-shaped: left→bottom
      [VertexType.c2]: { left: false, top: true, right: true, bottom: false }, // L-shaped: top→right
    };
    return patterns[vertexType];
  }

  private drawVertices(state: LatticeState): void {
    // Draw vertex connections first (faint lines)
    if (this.config.showGrid) {
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      this.ctx.lineWidth = 1;

      // Draw all edges as faint lines
      for (let row = 0; row < state.height; row++) {
        for (let col = 0; col <= state.width; col++) {
          const x = col * this.config.cellSize + this.config.cellSize / 2;
          const y = (row + 1) * this.config.cellSize;
          if (col < state.width) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + this.config.cellSize, y);
            this.ctx.stroke();
          }
        }
      }

      for (let row = 0; row <= state.height; row++) {
        for (let col = 0; col < state.width; col++) {
          const x = (col + 1) * this.config.cellSize;
          const y = row * this.config.cellSize + this.config.cellSize / 2;
          if (row < state.height) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x, y + this.config.cellSize);
            this.ctx.stroke();
          }
        }
      }
    }

    // Draw vertices with edge shading
    for (let row = 0; row < state.height; row++) {
      for (let col = 0; col < state.width; col++) {
        const vertex = state.vertices[row][col];
        const cx = (col + 1) * this.config.cellSize;
        const cy = (row + 1) * this.config.cellSize;
        const squareSize = this.config.cellSize * 0.7; // Size of the square
        const halfSize = squareSize / 2;
        const edges = this.getEdgePattern(vertex.type);
        const edgeWidth = squareSize * 0.15; // Width of edge shading

        // Draw vertex background square
        this.ctx.fillStyle = this.config.colors.vertexTypes[vertex.type];
        this.ctx.fillRect(cx - halfSize, cy - halfSize, squareSize, squareSize);

        // Draw edge shading patterns
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';

        if (edges.left) {
          this.ctx.fillRect(cx - halfSize, cy - halfSize, edgeWidth, squareSize);
        }
        if (edges.right) {
          this.ctx.fillRect(cx + halfSize - edgeWidth, cy - halfSize, edgeWidth, squareSize);
        }
        if (edges.top) {
          this.ctx.fillRect(cx - halfSize, cy - halfSize, squareSize, edgeWidth);
        }
        if (edges.bottom) {
          this.ctx.fillRect(cx - halfSize, cy + halfSize - edgeWidth, squareSize, edgeWidth);
        }

        // Draw border
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(cx - halfSize, cy - halfSize, squareSize, squareSize);

        // Draw vertex type label
        this.ctx.fillStyle = 'white';
        this.ctx.font = `bold ${Math.max(10, this.config.cellSize / 3)}px system-ui`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(vertex.type.toUpperCase(), cx, cy);
      }
    }
  }

  /**
   * Animate a flip operation
   */
  animateFlip(
    beforeState: LatticeState,
    afterState: LatticeState,
    positions: Position[],
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.config.animateFlips) {
        this.render(afterState);
        resolve();
        return;
      }

      const startTime = performance.now();
      const duration = this.config.animationDuration;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Render interpolated state
        this.render(beforeState);

        // Highlight changing vertices
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        for (const pos of positions) {
          const cx = (pos.col + 1) * this.config.cellSize;
          const cy = (pos.row + 1) * this.config.cellSize;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, this.config.cellSize / 3, 0, Math.PI * 2);
          this.ctx.stroke();
        }

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.render(afterState);
          resolve();
        }
      };

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  /**
   * Cancel ongoing animation
   */
  cancelAnimation(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Export canvas as image
   */
  exportImage(format: 'png' | 'jpeg' = 'png'): string {
    return this.canvas.toDataURL(`image/${format}`);
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }
}

/**
 * Create a new renderer instance
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  config?: Partial<RenderConfig>,
): PathRenderer {
  return new PathRenderer(canvas, config);
}
