/**
 * Maps vertex types to their bold edge patterns for path rendering
 * Based on Figure 1 from David Allison & Reshetikhin (2005) paper: arXiv:cond-mat/0502314v1
 *
 * In the paper's representation:
 * - Bold edges (thick lines) represent paths where arrows point in opposite directions
 * - Thin edges represent arrows pointing in the same direction
 *
 * Vertex type mappings from main.c:
 * - 0 = a1: arrows in from left & top, out to right & bottom
 * - 1 = a2: arrows in from right & bottom, out to left & top
 * - 2 = b1: arrows in from left & right, out to top & bottom
 * - 3 = b2: arrows in from top & bottom, out to left & right
 * - 4 = c1: arrows in from left & bottom, out to right & top
 * - 5 = c2: arrows in from right & top, out to left & bottom
 */

import { VertexType, EdgeDirection } from './types';

/**
 * Path segment definition - which edges connect to form paths through a vertex
 */
export interface PathSegment {
  from: EdgeDirection;
  to: EdgeDirection;
}

/**
 * Get the path segments (bold edges) for a given vertex type
 * Returns pairs of connected edges that form continuous paths
 *
 * Based on Figure 1 of the paper, bold edges occur when arrows on opposite
 * sides of the vertex point in opposite directions (creating a continuous path)
 */
export function getPathSegments(vertexType: VertexType): PathSegment[] {
  // Based on the correct interpretation from when it was working:
  // Bold paths show the ice configuration paths through vertices
  switch (vertexType) {
    case VertexType.a1:
      // Straight paths both horizontal and vertical
      return [
        { from: EdgeDirection.Left, to: EdgeDirection.Right },
        { from: EdgeDirection.Top, to: EdgeDirection.Bottom },
      ];

    case VertexType.a2:
      // Straight paths both horizontal and vertical (reversed)
      return [
        { from: EdgeDirection.Right, to: EdgeDirection.Left },
        { from: EdgeDirection.Bottom, to: EdgeDirection.Top },
      ];

    case VertexType.b1:
      // Vertical straight path only
      return [{ from: EdgeDirection.Top, to: EdgeDirection.Bottom }];

    case VertexType.b2:
      // Horizontal straight path only
      return [{ from: EdgeDirection.Left, to: EdgeDirection.Right }];

    case VertexType.c1:
      // L-shaped turn: left to bottom
      return [{ from: EdgeDirection.Left, to: EdgeDirection.Bottom }];

    case VertexType.c2:
      // L-shaped turn: top to right
      return [{ from: EdgeDirection.Top, to: EdgeDirection.Right }];
  }
}

/**
 * Check if two edges are connected through a vertex (form a path)
 */
export function areEdgesConnected(
  vertexType: VertexType,
  edge1: EdgeDirection,
  edge2: EdgeDirection,
): boolean {
  const segments = getPathSegments(vertexType);
  return segments.some(
    (seg) => (seg.from === edge1 && seg.to === edge2) || (seg.from === edge2 && seg.to === edge1),
  );
}

/**
 * Get the connected edge for a given edge through a vertex
 * Returns null if the edge doesn't connect through
 */
export function getConnectedEdge(
  vertexType: VertexType,
  fromEdge: EdgeDirection,
): EdgeDirection | null {
  const segments = getPathSegments(vertexType);

  for (const segment of segments) {
    if (segment.from === fromEdge) return segment.to;
    if (segment.to === fromEdge) return segment.from;
  }

  return null;
}

/**
 * Visual representation helper for debugging
 * Returns ASCII art representation of vertex type
 */
export function getVertexASCII(vertexType: VertexType): string[] {
  switch (vertexType) {
    case VertexType.a1:
      return ['  ↓  ', '→ ○ →', '  ↓  '];
    case VertexType.a2:
      return ['  ↑  ', '← ○ ←', '  ↑  '];
    case VertexType.b1:
      return ['  ↑  ', '→ ○ →', '  ↓  '];
    case VertexType.b2:
      return ['  ↓  ', '← ○ ←', '  ↑  '];
    case VertexType.c1:
      return ['  ↑  ', '→ ○ ←', '  ↑  '];
    case VertexType.c2:
      return ['  ↓  ', '→ ○ ←', '  ↓  '];
  }
}

/**
 * Get SVG path data for rendering vertex paths
 * Coordinates are relative to vertex center
 */
export function getVertexPathData(
  vertexType: VertexType,
  cellSize: number,
): { paths: string[]; arrows: Array<{ from: [number, number]; to: [number, number] }> } {
  const half = cellSize / 2;
  const paths: string[] = [];
  const arrows: Array<{ from: [number, number]; to: [number, number] }> = [];

  const segments = getPathSegments(vertexType);

  for (const segment of segments) {
    let pathData = '';
    const arrowData: { from: [number, number]; to: [number, number] } | null = null;

    // Create smooth curves for each path segment
    const start = getEdgePoint(segment.from, half);
    const end = getEdgePoint(segment.to, half);

    if (isStrightThrough(segment.from, segment.to)) {
      // Straight line for opposite edges
      pathData = `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`;
    } else {
      // Smooth curve for adjacent edges
      pathData = `M ${start[0]} ${start[1]} Q 0 0 ${end[0]} ${end[1]}`;
    }

    paths.push(pathData);

    // Add arrow data for arrow rendering mode
    const arrowStart = getEdgePoint(segment.from, half * 0.5);
    const arrowEnd = getEdgePoint(segment.to, half * 0.5);
    arrows.push({ from: arrowStart, to: arrowEnd });
  }

  return { paths, arrows };
}

/**
 * Get the point on the cell edge for a given direction
 */
function getEdgePoint(direction: EdgeDirection, distance: number): [number, number] {
  switch (direction) {
    case EdgeDirection.Left:
      return [-distance, 0];
    case EdgeDirection.Right:
      return [distance, 0];
    case EdgeDirection.Top:
      return [0, -distance];
    case EdgeDirection.Bottom:
      return [0, distance];
  }
}

/**
 * Check if two edges are opposite (straight through)
 */
function isStrightThrough(edge1: EdgeDirection, edge2: EdgeDirection): boolean {
  return (
    (edge1 === EdgeDirection.Left && edge2 === EdgeDirection.Right) ||
    (edge1 === EdgeDirection.Right && edge2 === EdgeDirection.Left) ||
    (edge1 === EdgeDirection.Top && edge2 === EdgeDirection.Bottom) ||
    (edge1 === EdgeDirection.Bottom && edge2 === EdgeDirection.Top)
  );
}
