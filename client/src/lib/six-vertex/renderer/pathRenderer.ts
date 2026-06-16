/**
 * Canvas-based renderer for the 6-vertex model
 * Supports both path and arrow rendering modes
 */

import type { LatticeState, RenderConfig, Position } from '../types';
import { RenderMode, EdgeState, VertexType } from '../types';
import { getPathSegments } from '../vertexShapes';
import type { PathSegment } from '../vertexShapes';
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
    // Use the new continuous path renderer that matches the paper style
    renderContinuousPaths(this.ctx, state, this.config.cellSize);
  }

  /**
   * Draw continuous paths that flow through the entire lattice (paper style)
   */
  private drawContinuousPaths(state: LatticeState): void {
    // Track which edges have been visited
    const visitedHorizontal: boolean[][] = Array(state.height + 1)
      .fill(null)
      .map(() => Array(state.width + 1).fill(false));
    const visitedVertical: boolean[][] = Array(state.height + 1)
      .fill(null)
      .map(() => Array(state.width + 1).fill(false));

    // Start from each edge and trace paths
    for (let row = 0; row <= state.height; row++) {
      for (let col = 0; col <= state.width; col++) {
        // Try starting from horizontal edge
        if (col < state.width && !visitedHorizontal[row][col]) {
          this.tracePath(
            state,
            { row, col, type: 'horizontal' },
            visitedHorizontal,
            visitedVertical,
          );
        }
        // Try starting from vertical edge
        if (row < state.height && !visitedVertical[row][col]) {
          this.tracePath(state, { row, col, type: 'vertical' }, visitedHorizontal, visitedVertical);
        }
      }
    }
  }

  /**
   * Trace a continuous path through the lattice
   */
  private tracePath(
    state: LatticeState,
    startEdge: { row: number; col: number; type: 'horizontal' | 'vertical' },
    visitedH: boolean[][],
    visitedV: boolean[][],
  ): void {
    const path: Array<{ x: number; y: number }> = [];
    let currentEdge = { ...startEdge };
    let firstMove = true;

    while (true) {
      // Mark edge as visited
      if (currentEdge.type === 'horizontal') {
        if (visitedH[currentEdge.row][currentEdge.col]) break;
        visitedH[currentEdge.row][currentEdge.col] = true;
      } else {
        if (visitedV[currentEdge.row][currentEdge.col]) break;
        visitedV[currentEdge.row][currentEdge.col] = true;
      }

      // Add edge midpoint to path
      const point = this.getEdgeMidpoint(currentEdge.row, currentEdge.col, currentEdge.type);
      if (firstMove) {
        path.push(point);
        firstMove = false;
      }

      // Find next connected edge through vertex
      const nextEdge = this.getConnectedEdgeInLattice(state, currentEdge);
      if (!nextEdge) break;

      // Add vertex point for smooth curve
      const vertexPoint = this.getVertexPoint(currentEdge, nextEdge);
      path.push(vertexPoint);

      // Add next edge midpoint
      const nextPoint = this.getEdgeMidpoint(nextEdge.row, nextEdge.col, nextEdge.type);
      path.push(nextPoint);

      currentEdge = nextEdge;

      // Check if we've returned to start (closed loop)
      if (
        currentEdge.row === startEdge.row &&
        currentEdge.col === startEdge.col &&
        currentEdge.type === startEdge.type
      ) {
        break;
      }
    }

    // Draw the path if it has points
    if (path.length > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(path[0].x, path[0].y);

      for (let i = 1; i < path.length; i++) {
        this.ctx.lineTo(path[i].x, path[i].y);
      }

      this.ctx.stroke();
    }
  }

  /**
   * Draw a single path segment
   */
  private drawPathSegment(cx: number, cy: number, segment: PathSegment): void {
    const half = this.config.cellSize / 2;

    // Get start and end points
    const start = this.getEdgePoint(cx, cy, segment.from, half);
    const end = this.getEdgePoint(cx, cy, segment.to, half);

    this.ctx.beginPath();

    // Check if it's a straight path or curved
    if (this.isOpposite(segment.from, segment.to)) {
      // Straight line
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
    } else {
      // Curved path through vertex center
      this.ctx.moveTo(start.x, start.y);
      this.ctx.quadraticCurveTo(cx, cy, end.x, end.y);
    }

    this.ctx.stroke();
  }

  /**
   * Return the opposite edge state (In <-> Out)
   */
  private oppositeOf(edge: EdgeState): EdgeState {
    return edge === EdgeState.In ? EdgeState.Out : EdgeState.In;
  }

  /**
   * Return populated horizontal/vertical edge arrays for the given state.
   *
   * The optimized simulation engine returns a LatticeState whose
   * `horizontalEdges` / `verticalEdges` are empty (`[]`), with the full
   * configuration carried only on `vertices[r][c].configuration`. When that is
   * the case we reconstruct the edge arrays from the vertex configurations using
   * the EXACT same convention the lattice builders use (see initialStates.ts):
   *
   *   vertex.left   = oppositeOf(horizontalEdges[r][c])
   *   vertex.right  = horizontalEdges[r][c + 1]
   *   vertex.top    = oppositeOf(verticalEdges[r][c])
   *   vertex.bottom = verticalEdges[r + 1][c]
   *
   * Inverting those relations gives the edges below. Dimensions match the
   * builders: horizontalEdges has `height` rows of `width + 1` entries,
   * verticalEdges has `height + 1` rows of `width` entries.
   */
  private ensureEdges(state: LatticeState): {
    horizontalEdges: EdgeState[][];
    verticalEdges: EdgeState[][];
  } {
    const hasHorizontal =
      state.horizontalEdges.length > 0 && state.horizontalEdges[0] !== undefined;
    const hasVertical = state.verticalEdges.length > 0 && state.verticalEdges[0] !== undefined;

    if (hasHorizontal && hasVertical) {
      return {
        horizontalEdges: state.horizontalEdges,
        verticalEdges: state.verticalEdges,
      };
    }

    const { width, height } = state;

    const horizontalEdges: EdgeState[][] = Array.from(
      { length: height },
      () => new Array<EdgeState>(width + 1),
    );
    const verticalEdges: EdgeState[][] = Array.from(
      { length: height + 1 },
      () => new Array<EdgeState>(width),
    );

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const { configuration } = state.vertices[row][col];

        // Right edge of (row,col) is the left edge of (row,col+1).
        horizontalEdges[row][col + 1] = configuration.right;
        // Bottom edge of (row,col) is the top edge of (row+1,col).
        verticalEdges[row + 1][col] = configuration.bottom;

        // Boundary edges derive from the inverse mapping.
        if (col === 0) {
          horizontalEdges[row][0] = this.oppositeOf(configuration.left);
        }
        if (row === 0) {
          verticalEdges[0][col] = this.oppositeOf(configuration.top);
        }
      }
    }

    return { horizontalEdges, verticalEdges };
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
   * Get edge point coordinates
   */
  private getEdgePoint(
    cx: number,
    cy: number,
    direction: string,
    distance: number,
  ): { x: number; y: number } {
    switch (direction) {
      case 'left':
        return { x: cx - distance, y: cy };
      case 'right':
        return { x: cx + distance, y: cy };
      case 'top':
        return { x: cx, y: cy - distance };
      case 'bottom':
        return { x: cx, y: cy + distance };
      default:
        return { x: cx, y: cy };
    }
  }

  /**
   * Check if two directions are opposite
   */
  private isOpposite(dir1: string, dir2: string): boolean {
    return (
      (dir1 === 'left' && dir2 === 'right') ||
      (dir1 === 'right' && dir2 === 'left') ||
      (dir1 === 'top' && dir2 === 'bottom') ||
      (dir1 === 'bottom' && dir2 === 'top')
    );
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

  /**
   * Get the midpoint of an edge
   */
  private getEdgeMidpoint(
    row: number,
    col: number,
    type: 'horizontal' | 'vertical',
  ): { x: number; y: number } {
    if (type === 'horizontal') {
      return {
        x: (col + 0.5) * this.config.cellSize,
        y: (row + 1) * this.config.cellSize,
      };
    } else {
      return {
        x: (col + 1) * this.config.cellSize,
        y: (row + 0.5) * this.config.cellSize,
      };
    }
  }

  /**
   * Get the vertex point between two edges
   */
  private getVertexPoint(
    edge1: { row: number; col: number; type: 'horizontal' | 'vertical' },
    edge2: { row: number; col: number; type: 'horizontal' | 'vertical' },
  ): { x: number; y: number } {
    // Find the common vertex
    let vertexRow: number, vertexCol: number;

    if (edge1.type === 'horizontal' && edge2.type === 'horizontal') {
      // Both horizontal - shouldn't happen in valid path
      vertexRow = edge1.row;
      vertexCol = Math.max(edge1.col, edge2.col);
    } else if (edge1.type === 'vertical' && edge2.type === 'vertical') {
      // Both vertical - shouldn't happen in valid path
      vertexRow = Math.max(edge1.row, edge2.row);
      vertexCol = edge1.col;
    } else if (edge1.type === 'horizontal') {
      // edge1 horizontal, edge2 vertical
      vertexRow = edge1.row;
      vertexCol = edge2.col;
    } else {
      // edge1 vertical, edge2 horizontal
      vertexRow = edge2.row;
      vertexCol = edge1.col;
    }

    return {
      x: (vertexCol + 1) * this.config.cellSize,
      y: (vertexRow + 1) * this.config.cellSize,
    };
  }

  /**
   * Get the connected edge through a vertex based on path flow
   */
  private getConnectedEdgeInLattice(
    state: LatticeState,
    currentEdge: { row: number; col: number; type: 'horizontal' | 'vertical' },
  ): { row: number; col: number; type: 'horizontal' | 'vertical' } | null {
    // Derive edge arrays from vertex configurations when the provided arrays are
    // empty (e.g. states produced by the optimized simulation engine).
    const { horizontalEdges, verticalEdges } = this.ensureEdges(state);

    // Determine which vertex this edge touches
    let vertexRow: number, vertexCol: number;
    let entryDirection: string;

    if (currentEdge.type === 'horizontal') {
      vertexRow = currentEdge.row - 1;
      // Determine if entering from left or right
      if (currentEdge.col === 0) {
        // Leftmost edge, entering vertex to its right
        vertexCol = 0;
        entryDirection = 'left';
      } else if (currentEdge.col === state.width) {
        // Rightmost edge, entering vertex to its left
        vertexCol = state.width - 1;
        entryDirection = 'right';
      } else {
        // Interior edge - need to check arrow direction
        const edgeState = horizontalEdges[currentEdge.row][currentEdge.col];
        if (edgeState === EdgeState.In) {
          // Arrow points right, so we enter the vertex to the right
          vertexCol = currentEdge.col;
          entryDirection = 'left';
        } else {
          // Arrow points left, so we enter the vertex to the left
          vertexCol = currentEdge.col - 1;
          entryDirection = 'right';
        }
      }
    } else {
      // Vertical edge
      vertexCol = currentEdge.col - 1;
      if (currentEdge.row === 0) {
        // Topmost edge
        vertexRow = 0;
        entryDirection = 'top';
      } else if (currentEdge.row === state.height) {
        // Bottommost edge
        vertexRow = state.height - 1;
        entryDirection = 'bottom';
      } else {
        // Interior edge
        const edgeState = verticalEdges[currentEdge.row][currentEdge.col];
        if (edgeState === EdgeState.In) {
          // Arrow points down
          vertexRow = currentEdge.row;
          entryDirection = 'top';
        } else {
          // Arrow points up
          vertexRow = currentEdge.row - 1;
          entryDirection = 'bottom';
        }
      }
    }

    // Check if vertex is in bounds
    if (vertexRow < 0 || vertexRow >= state.height || vertexCol < 0 || vertexCol >= state.width) {
      return null;
    }

    // Get the vertex and find the connected edge
    const vertex = state.vertices[vertexRow][vertexCol];
    const segments = getPathSegments(vertex.type);

    // Find which segment contains our entry direction
    for (const segment of segments) {
      if (
        (segment.from === entryDirection && segment.to !== entryDirection) ||
        (segment.to === entryDirection && segment.from !== entryDirection)
      ) {
        // Found the path through this vertex
        const exitDirection = segment.from === entryDirection ? segment.to : segment.from;

        // Convert exit direction to edge coordinates
        if (exitDirection === 'left') {
          return { row: vertexRow + 1, col: vertexCol, type: 'horizontal' };
        } else if (exitDirection === 'right') {
          return { row: vertexRow + 1, col: vertexCol + 1, type: 'horizontal' };
        } else if (exitDirection === 'top') {
          return { row: vertexRow, col: vertexCol + 1, type: 'vertical' };
        } else if (exitDirection === 'bottom') {
          return { row: vertexRow + 1, col: vertexCol + 1, type: 'vertical' };
        }
      }
    }

    return null;
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
