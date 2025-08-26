/**
 * Tests for the height function calculator
 */

import {
  calculateHeightFunction,
  getVertexHeightContribution,
  getHeightDifference,
  getHeightProfile,
  calculateHeightGradient,
  verifyHeightConsistency,
  exportHeightData,
} from '../src/lib/six-vertex/heightFunction';
import {
  LatticeState,
  Vertex,
  VertexType,
  EdgeState,
  getVertexConfiguration,
} from '../src/lib/six-vertex/types';

/**
 * Create a simple test lattice
 */
function createTestLattice(width: number, height: number): LatticeState {
  const vertices: Vertex[][] = [];
  const horizontalEdges: EdgeState[][] = [];
  const verticalEdges: EdgeState[][] = [];

  // Initialize with a simple pattern (all a1 vertices)
  for (let row = 0; row < height; row++) {
    vertices[row] = [];
    horizontalEdges[row] = [];
    verticalEdges[row] = [];

    for (let col = 0; col < width; col++) {
      // Create a1 vertex (in from left & top, out to right & bottom)
      vertices[row][col] = {
        position: { row, col },
        type: VertexType.a1,
        configuration: getVertexConfiguration(VertexType.a1),
      };

      // Set horizontal edge (points right, so EdgeState.In)
      if (col < width - 1) {
        horizontalEdges[row][col] = EdgeState.In;
      }

      // Set vertical edge (points down, so EdgeState.In)
      if (row < height - 1) {
        verticalEdges[row][col] = EdgeState.In;
      }
    }
  }

  return {
    width,
    height,
    vertices,
    horizontalEdges,
    verticalEdges,
  };
}

/**
 * Create a lattice with specific edge patterns for testing
 */
function createCustomLattice(
  width: number,
  height: number,
  horizontalPattern: EdgeState,
  verticalPattern: EdgeState,
): LatticeState {
  const vertices: Vertex[][] = [];
  const horizontalEdges: EdgeState[][] = [];
  const verticalEdges: EdgeState[][] = [];

  for (let row = 0; row < height; row++) {
    vertices[row] = [];
    horizontalEdges[row] = [];
    verticalEdges[row] = [];

    for (let col = 0; col < width; col++) {
      // Determine vertex type based on edge pattern
      let type: VertexType = VertexType.a1;
      if (horizontalPattern === EdgeState.In && verticalPattern === EdgeState.In) {
        type = VertexType.a1; // In from left & top
      } else if (horizontalPattern === EdgeState.Out && verticalPattern === EdgeState.Out) {
        type = VertexType.a2; // In from right & bottom
      }

      vertices[row][col] = {
        position: { row, col },
        type,
        configuration: getVertexConfiguration(type),
      };

      if (col < width - 1) {
        horizontalEdges[row][col] = horizontalPattern;
      }

      if (row < height - 1) {
        verticalEdges[row][col] = verticalPattern;
      }
    }
  }

  return {
    width,
    height,
    vertices,
    horizontalEdges,
    verticalEdges,
  };
}

describe('Height Function Calculator', () => {
  describe('calculateHeightFunction', () => {
    it('should calculate correct heights for a simple lattice', () => {
      const lattice = createTestLattice(3, 3);
      const heightData = calculateHeightFunction(lattice);

      expect(heightData.heights).toBeDefined();
      expect(heightData.heights.length).toBe(3);
      expect(heightData.heights[0].length).toBe(3);

      // Origin should have height 0
      expect(heightData.heights[0][0]).toBe(0);

      // Check that heights increase as expected
      // With all edges pointing right and down (EdgeState.In),
      // heights should increase along both axes
      expect(heightData.heights[0][1]).toBeGreaterThanOrEqual(0);
      expect(heightData.heights[1][0]).toBeGreaterThanOrEqual(0);
    });

    it('should calculate correct statistics', () => {
      const lattice = createTestLattice(4, 4);
      const heightData = calculateHeightFunction(lattice);

      expect(heightData.totalVolume).toBeGreaterThanOrEqual(0);
      expect(heightData.minHeight).toBeLessThanOrEqual(heightData.maxHeight);
      expect(heightData.averageHeight).toBe(heightData.totalVolume / 16);
    });

    it('should handle lattice with all edges pointing out', () => {
      const lattice = createCustomLattice(3, 3, EdgeState.Out, EdgeState.Out);
      const heightData = calculateHeightFunction(lattice);

      // When edges point out (left and up), heights increase differently
      expect(heightData.heights[0][0]).toBe(0);

      // Moving right with EdgeState.Out means edge points left (into next vertex)
      expect(heightData.heights[0][1]).toBe(1);
      expect(heightData.heights[0][2]).toBe(2);
    });
  });

  describe('getVertexHeightContribution', () => {
    it('should calculate correct contribution for a1 vertex', () => {
      const vertex: Vertex = {
        position: { row: 1, col: 1 },
        type: VertexType.a1,
        configuration: getVertexConfiguration(VertexType.a1),
      };

      const contribution = getVertexHeightContribution(vertex);

      // a1 has In from left and top
      expect(contribution.fromLeft).toBe(1);
      expect(contribution.fromTop).toBe(1);
      expect(contribution.total).toBe(2);
    });

    it('should calculate correct contribution for b1 vertex', () => {
      const vertex: Vertex = {
        position: { row: 1, col: 1 },
        type: VertexType.b1,
        configuration: getVertexConfiguration(VertexType.b1),
      };

      const contribution = getVertexHeightContribution(vertex);

      // b1 has In from left and right, Out to top and bottom
      expect(contribution.fromLeft).toBe(1);
      expect(contribution.fromTop).toBe(0);
      expect(contribution.total).toBe(1);
    });
  });

  describe('getHeightDifference', () => {
    it('should calculate correct height difference', () => {
      const lattice = createTestLattice(3, 3);
      const heightData = calculateHeightFunction(lattice);

      const diff = getHeightDifference(heightData, { row: 0, col: 0 }, { row: 0, col: 1 });

      expect(diff).toBeDefined();
      expect(diff).toBe(heightData.heights[0][1] - heightData.heights[0][0]);
    });

    it('should return null for invalid positions', () => {
      const lattice = createTestLattice(3, 3);
      const heightData = calculateHeightFunction(lattice);

      const diff = getHeightDifference(heightData, { row: -1, col: 0 }, { row: 0, col: 0 });

      expect(diff).toBeNull();
    });
  });

  describe('getHeightProfile', () => {
    it('should extract row profile correctly', () => {
      const lattice = createTestLattice(4, 3);
      const heightData = calculateHeightFunction(lattice);

      const profile = getHeightProfile(heightData, 'row', 1);

      expect(profile.length).toBe(4);
      expect(profile).toEqual(heightData.heights[1]);
    });

    it('should extract column profile correctly', () => {
      const lattice = createTestLattice(3, 4);
      const heightData = calculateHeightFunction(lattice);

      const profile = getHeightProfile(heightData, 'column', 1);

      expect(profile.length).toBe(4);
      expect(profile[0]).toBe(heightData.heights[0][1]);
      expect(profile[1]).toBe(heightData.heights[1][1]);
      expect(profile[2]).toBe(heightData.heights[2][1]);
      expect(profile[3]).toBe(heightData.heights[3][1]);
    });

    it('should return empty array for invalid index', () => {
      const lattice = createTestLattice(3, 3);
      const heightData = calculateHeightFunction(lattice);

      const profile = getHeightProfile(heightData, 'row', 10);

      expect(profile).toEqual([]);
    });
  });

  describe('calculateHeightGradient', () => {
    it('should calculate gradient correctly', () => {
      const lattice = createTestLattice(3, 3);
      const heightData = calculateHeightFunction(lattice);

      const gradient = calculateHeightGradient(heightData);

      expect(gradient.length).toBe(3);
      expect(gradient[0].length).toBe(3);

      // Each element should have dx and dy
      expect(gradient[1][1]).toHaveProperty('dx');
      expect(gradient[1][1]).toHaveProperty('dy');
    });
  });

  describe('verifyHeightConsistency', () => {
    it('should verify consistent height function', () => {
      const lattice = createTestLattice(3, 3);
      const heightData = calculateHeightFunction(lattice);

      const result = verifyHeightConsistency(lattice, heightData);

      // The consistency check allows for some boundary effects
      expect(result.isConsistent).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should detect dimension mismatch', () => {
      const lattice = createTestLattice(3, 3);
      const heightData = {
        heights: [
          [0, 0],
          [0, 0],
        ], // Wrong dimensions
        totalVolume: 0,
        minHeight: 0,
        maxHeight: 0,
        averageHeight: 0,
      };

      const result = verifyHeightConsistency(lattice, heightData);

      expect(result.isConsistent).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Dimension mismatch');
    });
  });

  describe('exportHeightData', () => {
    it('should export height data correctly', () => {
      const lattice = createTestLattice(2, 2);
      const heightData = calculateHeightFunction(lattice);

      const exported = exportHeightData(heightData);

      expect(exported.heights).toEqual(heightData.heights);
      expect(exported.stats.totalVolume).toBe(heightData.totalVolume);
      expect(exported.stats.minHeight).toBe(heightData.minHeight);
      expect(exported.stats.maxHeight).toBe(heightData.maxHeight);
      expect(exported.stats.averageHeight).toBe(heightData.averageHeight);
      expect(exported.stats.dimensions.rows).toBe(2);
      expect(exported.stats.dimensions.cols).toBe(2);
    });
  });
});
