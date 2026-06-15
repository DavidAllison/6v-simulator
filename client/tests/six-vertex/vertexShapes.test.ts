/**
 * Test suite for vertex shapes and path configurations
 * Verifies correctness against Figure 1 from David Allison & Reshetikhin (2005) paper
 *
 * GROUND TRUTH (paper Fig. 1 + reference main.c draw_vertex, L927-1094):
 * Bold path-segment counts per vertex type:
 *   a1 = 2  (Left-Right horizontal AND Top-Bottom vertical)
 *   a2 = 0  (all edges thin / no bold path segments)
 *   b1 = 1  (Top-Bottom vertical)
 *   b2 = 1  (Left-Right horizontal)
 *   c1 = 1  (Left-Bottom turn)
 *   c2 = 1  (Top-Right turn)
 *
 * In main.c the case index maps to weights wts[0..5] = a1,a2,b1,b2,c1,c2.
 * Bold = cpdf_setlinewidth 2 + black (0,0,0); thin = linewidth 1 + grey (.8).
 */

import {
  getPathSegments,
  areEdgesConnected,
  getConnectedEdge,
  getVertexASCII,
  getVertexPathData,
} from '../../src/lib/six-vertex/vertexShapes';
import { VertexType, EdgeDirection } from '../../src/lib/six-vertex/types';

describe('Vertex Shapes - Truth Table Tests', () => {
  describe('Figure 1 Correspondence Tests', () => {
    describe('Type a1 vertex', () => {
      it('should have two bold path segments (horizontal and vertical through)', () => {
        const segments = getPathSegments(VertexType.a1);

        expect(segments).toHaveLength(2);
        expect(segments).toContainEqual({
          from: EdgeDirection.Left,
          to: EdgeDirection.Right,
        });
        expect(segments).toContainEqual({
          from: EdgeDirection.Top,
          to: EdgeDirection.Bottom,
        });
      });

      it('should satisfy ice rule (2-in, 2-out) with arrows in from left & top', () => {
        // a1: arrows in from left & top, out to right & bottom
        // All four edges are bold: straight through horizontally and vertically.
        const segments = getPathSegments(VertexType.a1);

        // With two straight-through segments, each edge appears exactly once.
        const edgeCount = new Map<EdgeDirection, number>();
        for (const segment of segments) {
          edgeCount.set(segment.from, (edgeCount.get(segment.from) || 0) + 1);
          edgeCount.set(segment.to, (edgeCount.get(segment.to) || 0) + 1);
        }

        expect(edgeCount.get(EdgeDirection.Left)).toBe(1);
        expect(edgeCount.get(EdgeDirection.Right)).toBe(1);
        expect(edgeCount.get(EdgeDirection.Top)).toBe(1);
        expect(edgeCount.get(EdgeDirection.Bottom)).toBe(1);
      });

      it('should have correct edge connections', () => {
        expect(areEdgesConnected(VertexType.a1, EdgeDirection.Left, EdgeDirection.Right)).toBe(
          true,
        );
        expect(areEdgesConnected(VertexType.a1, EdgeDirection.Top, EdgeDirection.Bottom)).toBe(
          true,
        );
        expect(areEdgesConnected(VertexType.a1, EdgeDirection.Left, EdgeDirection.Top)).toBe(false);
        expect(areEdgesConnected(VertexType.a1, EdgeDirection.Right, EdgeDirection.Bottom)).toBe(
          false,
        );
      });
    });

    describe('Type a2 vertex', () => {
      it('should have no bold path segments (all edges thin)', () => {
        // Per main.c case 1 (a2): all four edges are drawn thin/grey,
        // so there are zero bold path segments.
        const segments = getPathSegments(VertexType.a2);

        expect(segments).toHaveLength(0);
      });

      it('should connect no edges (no bold paths)', () => {
        expect(areEdgesConnected(VertexType.a2, EdgeDirection.Left, EdgeDirection.Right)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.a2, EdgeDirection.Top, EdgeDirection.Bottom)).toBe(
          false,
        );
        expect(getConnectedEdge(VertexType.a2, EdgeDirection.Left)).toBeNull();
        expect(getConnectedEdge(VertexType.a2, EdgeDirection.Top)).toBeNull();
      });
    });

    describe('Type b1 vertex', () => {
      it('should have one bold path segment (vertical Top-Bottom)', () => {
        // Per main.c case 2 (b1): top & bottom bold, left & right thin.
        const segments = getPathSegments(VertexType.b1);

        expect(segments).toHaveLength(1);
        expect(segments).toContainEqual({
          from: EdgeDirection.Top,
          to: EdgeDirection.Bottom,
        });
      });

      it('should connect only Top-Bottom', () => {
        expect(areEdgesConnected(VertexType.b1, EdgeDirection.Top, EdgeDirection.Bottom)).toBe(
          true,
        );
        expect(areEdgesConnected(VertexType.b1, EdgeDirection.Left, EdgeDirection.Right)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.b1, EdgeDirection.Left, EdgeDirection.Top)).toBe(false);
        expect(areEdgesConnected(VertexType.b1, EdgeDirection.Right, EdgeDirection.Bottom)).toBe(
          false,
        );
      });
    });

    describe('Type b2 vertex', () => {
      it('should have one bold path segment (horizontal Left-Right)', () => {
        // Per main.c case 3 (b2): left & right bold, top & bottom thin.
        const segments = getPathSegments(VertexType.b2);

        expect(segments).toHaveLength(1);
        expect(segments).toContainEqual({
          from: EdgeDirection.Left,
          to: EdgeDirection.Right,
        });
      });

      it('should connect only Left-Right', () => {
        expect(areEdgesConnected(VertexType.b2, EdgeDirection.Left, EdgeDirection.Right)).toBe(
          true,
        );
        expect(areEdgesConnected(VertexType.b2, EdgeDirection.Top, EdgeDirection.Bottom)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.b2, EdgeDirection.Top, EdgeDirection.Left)).toBe(false);
        expect(areEdgesConnected(VertexType.b2, EdgeDirection.Bottom, EdgeDirection.Right)).toBe(
          false,
        );
      });
    });

    describe('Type c1 vertex', () => {
      it('should have one bold path segment (Left-Bottom turn)', () => {
        // Per main.c case 4 (c1): bottom & left bold, top & right thin.
        const segments = getPathSegments(VertexType.c1);

        expect(segments).toHaveLength(1);
        expect(segments).toContainEqual({
          from: EdgeDirection.Left,
          to: EdgeDirection.Bottom,
        });
      });

      it('should connect only Left-Bottom', () => {
        expect(areEdgesConnected(VertexType.c1, EdgeDirection.Left, EdgeDirection.Bottom)).toBe(
          true,
        );
        expect(areEdgesConnected(VertexType.c1, EdgeDirection.Right, EdgeDirection.Top)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.c1, EdgeDirection.Left, EdgeDirection.Right)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.c1, EdgeDirection.Top, EdgeDirection.Bottom)).toBe(
          false,
        );
      });
    });

    describe('Type c2 vertex', () => {
      it('should have one bold path segment (Top-Right turn)', () => {
        // Per main.c case 5 (c2): top & right bold, bottom & left thin.
        const segments = getPathSegments(VertexType.c2);

        expect(segments).toHaveLength(1);
        expect(segments).toContainEqual({
          from: EdgeDirection.Top,
          to: EdgeDirection.Right,
        });
      });

      it('should connect only Top-Right', () => {
        expect(areEdgesConnected(VertexType.c2, EdgeDirection.Top, EdgeDirection.Right)).toBe(true);
        expect(areEdgesConnected(VertexType.c2, EdgeDirection.Left, EdgeDirection.Bottom)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.c2, EdgeDirection.Right, EdgeDirection.Bottom)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.c2, EdgeDirection.Left, EdgeDirection.Top)).toBe(false);
      });
    });
  });

  describe('Bold Path-Segment Count Validation', () => {
    it('should produce the correct per-type bold segment counts (paper Fig.1 / main.c)', () => {
      // Ground truth bold segment counts.
      const expectedCounts: Array<[VertexType, number]> = [
        [VertexType.a1, 2],
        [VertexType.a2, 0],
        [VertexType.b1, 1],
        [VertexType.b2, 1],
        [VertexType.c1, 1],
        [VertexType.c2, 1],
      ];

      for (const [type, expected] of expectedCounts) {
        expect(getPathSegments(type)).toHaveLength(expected);
      }
    });

    it('should never list any edge more than once within a vertex', () => {
      const vertexTypes = [
        VertexType.a1,
        VertexType.a2,
        VertexType.b1,
        VertexType.b2,
        VertexType.c1,
        VertexType.c2,
      ];

      for (const type of vertexTypes) {
        const segments = getPathSegments(type);
        const edgeCount = new Map<EdgeDirection, number>();

        for (const segment of segments) {
          edgeCount.set(segment.from, (edgeCount.get(segment.from) || 0) + 1);
          edgeCount.set(segment.to, (edgeCount.get(segment.to) || 0) + 1);
        }

        // No edge may participate in more than one bold path segment.
        for (const count of edgeCount.values()) {
          expect(count).toBe(1);
        }
      }
    });
  });

  describe('Helper Functions', () => {
    describe('getConnectedEdge', () => {
      it('should return correct connected edge for each direction', () => {
        // a1 (straight through both ways)
        expect(getConnectedEdge(VertexType.a1, EdgeDirection.Left)).toBe(EdgeDirection.Right);
        expect(getConnectedEdge(VertexType.a1, EdgeDirection.Right)).toBe(EdgeDirection.Left);
        expect(getConnectedEdge(VertexType.a1, EdgeDirection.Top)).toBe(EdgeDirection.Bottom);
        expect(getConnectedEdge(VertexType.a1, EdgeDirection.Bottom)).toBe(EdgeDirection.Top);

        // b1 (vertical Top-Bottom only; horizontal edges are not connected)
        expect(getConnectedEdge(VertexType.b1, EdgeDirection.Top)).toBe(EdgeDirection.Bottom);
        expect(getConnectedEdge(VertexType.b1, EdgeDirection.Bottom)).toBe(EdgeDirection.Top);
        expect(getConnectedEdge(VertexType.b1, EdgeDirection.Left)).toBeNull();
        expect(getConnectedEdge(VertexType.b1, EdgeDirection.Right)).toBeNull();

        // c2 (Top-Right turn only)
        expect(getConnectedEdge(VertexType.c2, EdgeDirection.Top)).toBe(EdgeDirection.Right);
        expect(getConnectedEdge(VertexType.c2, EdgeDirection.Right)).toBe(EdgeDirection.Top);
        expect(getConnectedEdge(VertexType.c2, EdgeDirection.Left)).toBeNull();
        expect(getConnectedEdge(VertexType.c2, EdgeDirection.Bottom)).toBeNull();
      });
    });

    describe('getVertexASCII', () => {
      it('should return valid ASCII representations', () => {
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
          expect(ascii).toHaveLength(3);
          expect(ascii[0]).toHaveLength(5);
          expect(ascii[1]).toHaveLength(5);
          expect(ascii[2]).toHaveLength(5);
          expect(ascii[1]).toContain('○'); // Center vertex marker
        }
      });
    });

    describe('getVertexPathData', () => {
      it('should generate valid SVG path data with one entry per bold segment', () => {
        const cellSize = 20;
        // Expected number of bold path segments per type (paper Fig.1 / main.c).
        const expectedCounts: Array<[VertexType, number]> = [
          [VertexType.a1, 2],
          [VertexType.a2, 0],
          [VertexType.b1, 1],
          [VertexType.b2, 1],
          [VertexType.c1, 1],
          [VertexType.c2, 1],
        ];

        for (const [type, expected] of expectedCounts) {
          const { paths, arrows } = getVertexPathData(type, cellSize);

          // One SVG path and one arrow per bold path segment.
          expect(paths).toHaveLength(expected);
          expect(arrows).toHaveLength(expected);

          // Each path should be a valid SVG path string.
          for (const path of paths) {
            expect(path).toMatch(/^M .* (L|Q) .*$/);
          }

          // Each arrow should have valid coordinates.
          for (const arrow of arrows) {
            expect(arrow.from).toHaveLength(2);
            expect(arrow.to).toHaveLength(2);
            expect(typeof arrow.from[0]).toBe('number');
            expect(typeof arrow.from[1]).toBe('number');
            expect(typeof arrow.to[0]).toBe('number');
            expect(typeof arrow.to[1]).toBe('number');
          }
        }
      });

      it('should generate straight paths for opposite edges', () => {
        const cellSize = 20;
        const { paths } = getVertexPathData(VertexType.a1, cellSize);

        // a1 has straight-through paths, should use L (line) commands.
        for (const path of paths) {
          expect(path).toContain(' L ');
        }
      });

      it('should generate curved paths for adjacent edges', () => {
        const cellSize = 20;
        // c2 has a single Top-Right turning path, should use Q (quadratic curve).
        const { paths } = getVertexPathData(VertexType.c2, cellSize);

        expect(paths).toHaveLength(1);
        for (const path of paths) {
          expect(path).toContain(' Q ');
        }
      });
    });
  });

  describe('Symmetry Tests', () => {
    it('should have a1 fully bold (2 segments) and a2 empty (0 segments)', () => {
      const a1Segments = getPathSegments(VertexType.a1);
      const a2Segments = getPathSegments(VertexType.a2);

      // a1 has both straight-through bold paths; a2 has none.
      expect(a1Segments).toHaveLength(2);
      expect(a2Segments).toHaveLength(0);

      const a1HasHorizontal = a1Segments.some(
        (s) =>
          (s.from === EdgeDirection.Left && s.to === EdgeDirection.Right) ||
          (s.from === EdgeDirection.Right && s.to === EdgeDirection.Left),
      );
      expect(a1HasHorizontal).toBe(true);
    });

    it('should have complementary straight paths for b1 (vertical) and b2 (horizontal)', () => {
      const b1Segments = getPathSegments(VertexType.b1);
      const b2Segments = getPathSegments(VertexType.b2);

      // Each b-type has exactly one straight bold path.
      expect(b1Segments).toHaveLength(1);
      expect(b2Segments).toHaveLength(1);

      // b1 is vertical (Top-Bottom); b2 is horizontal (Left-Right).
      expect(areEdgesConnected(VertexType.b1, EdgeDirection.Top, EdgeDirection.Bottom)).toBe(true);
      expect(areEdgesConnected(VertexType.b2, EdgeDirection.Left, EdgeDirection.Right)).toBe(true);
    });

    it('should have complementary turn paths for c1 (Left-Bottom) and c2 (Top-Right)', () => {
      const c1Segments = getPathSegments(VertexType.c1);
      const c2Segments = getPathSegments(VertexType.c2);

      // Each c-type has exactly one turning bold path.
      expect(c1Segments).toHaveLength(1);
      expect(c2Segments).toHaveLength(1);

      // c1 connects Left-Bottom; c2 connects Top-Right.
      expect(areEdgesConnected(VertexType.c1, EdgeDirection.Left, EdgeDirection.Bottom)).toBe(true);
      expect(areEdgesConnected(VertexType.c2, EdgeDirection.Top, EdgeDirection.Right)).toBe(true);
    });
  });
});
