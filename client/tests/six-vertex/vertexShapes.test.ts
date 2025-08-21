/**
 * Test suite for vertex shapes and path configurations
 * Verifies correctness against Figure 1 from David Allison & Reshetikhin (2005) paper
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
      it('should have correct path segments (horizontal and vertical through)', () => {
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
        // This means the bold paths go straight through horizontally and vertically
        const segments = getPathSegments(VertexType.a1);

        // Verify all edges are accounted for (each edge should be in exactly one path)
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
      it('should have correct path segments (horizontal and vertical through)', () => {
        const segments = getPathSegments(VertexType.a2);

        expect(segments).toHaveLength(2);
        expect(segments).toContainEqual({
          from: EdgeDirection.Right,
          to: EdgeDirection.Left,
        });
        expect(segments).toContainEqual({
          from: EdgeDirection.Bottom,
          to: EdgeDirection.Top,
        });
      });

      it('should satisfy ice rule (2-in, 2-out) with arrows in from right & bottom', () => {
        const segments = getPathSegments(VertexType.a2);

        const edgeCount = new Map<EdgeDirection, number>();
        for (const segment of segments) {
          edgeCount.set(segment.from, (edgeCount.get(segment.from) || 0) + 1);
          edgeCount.set(segment.to, (edgeCount.get(segment.to) || 0) + 1);
        }

        expect(edgeCount.size).toBe(4);
        expect(edgeCount.get(EdgeDirection.Left)).toBe(1);
        expect(edgeCount.get(EdgeDirection.Right)).toBe(1);
        expect(edgeCount.get(EdgeDirection.Top)).toBe(1);
        expect(edgeCount.get(EdgeDirection.Bottom)).toBe(1);
      });
    });

    describe('Type b1 vertex', () => {
      it('should have correct path segments (left-to-top and right-to-bottom turns)', () => {
        const segments = getPathSegments(VertexType.b1);

        expect(segments).toHaveLength(2);
        expect(segments).toContainEqual({
          from: EdgeDirection.Left,
          to: EdgeDirection.Top,
        });
        expect(segments).toContainEqual({
          from: EdgeDirection.Right,
          to: EdgeDirection.Bottom,
        });
      });

      it('should satisfy ice rule with turning paths', () => {
        // b1: arrows in from left & right, out to top & bottom
        expect(areEdgesConnected(VertexType.b1, EdgeDirection.Left, EdgeDirection.Top)).toBe(true);
        expect(areEdgesConnected(VertexType.b1, EdgeDirection.Right, EdgeDirection.Bottom)).toBe(
          true,
        );
        expect(areEdgesConnected(VertexType.b1, EdgeDirection.Left, EdgeDirection.Right)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.b1, EdgeDirection.Top, EdgeDirection.Bottom)).toBe(
          false,
        );
      });
    });

    describe('Type b2 vertex', () => {
      it('should have correct path segments (top-to-left and bottom-to-right turns)', () => {
        const segments = getPathSegments(VertexType.b2);

        expect(segments).toHaveLength(2);
        expect(segments).toContainEqual({
          from: EdgeDirection.Top,
          to: EdgeDirection.Left,
        });
        expect(segments).toContainEqual({
          from: EdgeDirection.Bottom,
          to: EdgeDirection.Right,
        });
      });

      it('should satisfy ice rule with turning paths', () => {
        // b2: arrows in from top & bottom, out to left & right
        expect(areEdgesConnected(VertexType.b2, EdgeDirection.Top, EdgeDirection.Left)).toBe(true);
        expect(areEdgesConnected(VertexType.b2, EdgeDirection.Bottom, EdgeDirection.Right)).toBe(
          true,
        );
        expect(areEdgesConnected(VertexType.b2, EdgeDirection.Top, EdgeDirection.Bottom)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.b2, EdgeDirection.Left, EdgeDirection.Right)).toBe(
          false,
        );
      });
    });

    describe('Type c1 vertex', () => {
      it('should have correct path segments (left-to-bottom and right-to-top turns)', () => {
        const segments = getPathSegments(VertexType.c1);

        expect(segments).toHaveLength(2);
        expect(segments).toContainEqual({
          from: EdgeDirection.Left,
          to: EdgeDirection.Bottom,
        });
        expect(segments).toContainEqual({
          from: EdgeDirection.Right,
          to: EdgeDirection.Top,
        });
      });

      it('should satisfy ice rule with crossing paths', () => {
        // c1: arrows in from left & bottom, out to right & top
        expect(areEdgesConnected(VertexType.c1, EdgeDirection.Left, EdgeDirection.Bottom)).toBe(
          true,
        );
        expect(areEdgesConnected(VertexType.c1, EdgeDirection.Right, EdgeDirection.Top)).toBe(true);
        expect(areEdgesConnected(VertexType.c1, EdgeDirection.Left, EdgeDirection.Right)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.c1, EdgeDirection.Top, EdgeDirection.Bottom)).toBe(
          false,
        );
      });
    });

    describe('Type c2 vertex', () => {
      it('should have correct path segments (right-to-bottom and left-to-top turns)', () => {
        const segments = getPathSegments(VertexType.c2);

        expect(segments).toHaveLength(2);
        expect(segments).toContainEqual({
          from: EdgeDirection.Right,
          to: EdgeDirection.Bottom,
        });
        expect(segments).toContainEqual({
          from: EdgeDirection.Left,
          to: EdgeDirection.Top,
        });
      });

      it('should satisfy ice rule with crossing paths', () => {
        // c2: arrows in from right & top, out to left & bottom
        expect(areEdgesConnected(VertexType.c2, EdgeDirection.Right, EdgeDirection.Bottom)).toBe(
          true,
        );
        expect(areEdgesConnected(VertexType.c2, EdgeDirection.Left, EdgeDirection.Top)).toBe(true);
        expect(areEdgesConnected(VertexType.c2, EdgeDirection.Right, EdgeDirection.Top)).toBe(
          false,
        );
        expect(areEdgesConnected(VertexType.c2, EdgeDirection.Left, EdgeDirection.Bottom)).toBe(
          false,
        );
      });
    });
  });

  describe('Ice Rule Validation', () => {
    it('should ensure every vertex type has exactly 2 path segments', () => {
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
        expect(segments).toHaveLength(2);
      }
    });

    it('should ensure each edge appears exactly once in path segments', () => {
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

        // Each of the 4 edges should appear exactly once
        expect(edgeCount.size).toBe(4);
        expect(edgeCount.get(EdgeDirection.Left)).toBe(1);
        expect(edgeCount.get(EdgeDirection.Right)).toBe(1);
        expect(edgeCount.get(EdgeDirection.Top)).toBe(1);
        expect(edgeCount.get(EdgeDirection.Bottom)).toBe(1);
      }
    });
  });

  describe('Helper Functions', () => {
    describe('getConnectedEdge', () => {
      it('should return correct connected edge for each direction', () => {
        // Test a1 (straight through)
        expect(getConnectedEdge(VertexType.a1, EdgeDirection.Left)).toBe(EdgeDirection.Right);
        expect(getConnectedEdge(VertexType.a1, EdgeDirection.Right)).toBe(EdgeDirection.Left);
        expect(getConnectedEdge(VertexType.a1, EdgeDirection.Top)).toBe(EdgeDirection.Bottom);
        expect(getConnectedEdge(VertexType.a1, EdgeDirection.Bottom)).toBe(EdgeDirection.Top);

        // Test b1 (turns)
        expect(getConnectedEdge(VertexType.b1, EdgeDirection.Left)).toBe(EdgeDirection.Top);
        expect(getConnectedEdge(VertexType.b1, EdgeDirection.Top)).toBe(EdgeDirection.Left);
        expect(getConnectedEdge(VertexType.b1, EdgeDirection.Right)).toBe(EdgeDirection.Bottom);
        expect(getConnectedEdge(VertexType.b1, EdgeDirection.Bottom)).toBe(EdgeDirection.Right);

        // Test c2 (crosses)
        expect(getConnectedEdge(VertexType.c2, EdgeDirection.Right)).toBe(EdgeDirection.Bottom);
        expect(getConnectedEdge(VertexType.c2, EdgeDirection.Bottom)).toBe(EdgeDirection.Right);
        expect(getConnectedEdge(VertexType.c2, EdgeDirection.Left)).toBe(EdgeDirection.Top);
        expect(getConnectedEdge(VertexType.c2, EdgeDirection.Top)).toBe(EdgeDirection.Left);
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
      it('should generate valid SVG path data', () => {
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

          // Should have 2 paths (one for each path segment)
          expect(paths).toHaveLength(2);
          expect(arrows).toHaveLength(2);

          // Each path should be a valid SVG path string
          for (const path of paths) {
            expect(path).toMatch(/^M .* (L|Q) .*$/);
          }

          // Each arrow should have valid coordinates
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

        // a1 has straight-through paths, should use L (line) commands
        for (const path of paths) {
          expect(path).toContain(' L ');
        }
      });

      it('should generate curved paths for adjacent edges', () => {
        const cellSize = 20;
        const { paths } = getVertexPathData(VertexType.b1, cellSize);

        // b1 has turning paths, should use Q (quadratic curve) commands
        for (const path of paths) {
          expect(path).toContain(' Q ');
        }
      });
    });
  });

  describe('Symmetry Tests', () => {
    it('should have symmetric path configurations for a1 and a2', () => {
      const a1Segments = getPathSegments(VertexType.a1);
      const a2Segments = getPathSegments(VertexType.a2);

      // Both should have straight-through paths
      expect(a1Segments).toHaveLength(2);
      expect(a2Segments).toHaveLength(2);

      // a2 is the opposite of a1 (arrows reversed)
      // But paths should still connect opposite edges
      const a1HasHorizontal = a1Segments.some(
        (s) =>
          (s.from === EdgeDirection.Left && s.to === EdgeDirection.Right) ||
          (s.from === EdgeDirection.Right && s.to === EdgeDirection.Left),
      );
      const a2HasHorizontal = a2Segments.some(
        (s) =>
          (s.from === EdgeDirection.Left && s.to === EdgeDirection.Right) ||
          (s.from === EdgeDirection.Right && s.to === EdgeDirection.Left),
      );

      expect(a1HasHorizontal).toBe(true);
      expect(a2HasHorizontal).toBe(true);
    });

    it('should have symmetric path configurations for b1 and b2', () => {
      const b1Segments = getPathSegments(VertexType.b1);
      const b2Segments = getPathSegments(VertexType.b2);

      // Both should have turning paths
      expect(b1Segments).toHaveLength(2);
      expect(b2Segments).toHaveLength(2);

      // b1 connects left-top and right-bottom
      // b2 connects top-left and bottom-right (rotated 90 degrees)
      expect(areEdgesConnected(VertexType.b1, EdgeDirection.Left, EdgeDirection.Top)).toBe(true);
      expect(areEdgesConnected(VertexType.b2, EdgeDirection.Top, EdgeDirection.Left)).toBe(true);
    });

    it('should have symmetric path configurations for c1 and c2', () => {
      const c1Segments = getPathSegments(VertexType.c1);
      const c2Segments = getPathSegments(VertexType.c2);

      // Both should have crossing paths
      expect(c1Segments).toHaveLength(2);
      expect(c2Segments).toHaveLength(2);

      // c1 connects left-bottom and right-top
      // c2 connects right-bottom and left-top (mirrored)
      expect(areEdgesConnected(VertexType.c1, EdgeDirection.Left, EdgeDirection.Bottom)).toBe(true);
      expect(areEdgesConnected(VertexType.c2, EdgeDirection.Right, EdgeDirection.Bottom)).toBe(
        true,
      );
    });
  });
});
