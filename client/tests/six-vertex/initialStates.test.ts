/**
 * Test suite for initial state generators
 * Verifies DWBC patterns match Figures 2 and 3 from the paper
 */

import {
  generateDWBCHigh,
  generateDWBCLow,
  generateDWBCState,
  generateRandomIceState,
  generateUniformState,
  validateIceRule,
} from '../../src/lib/six-vertex/initialStates';
import { VertexType, EdgeState, DWBCConfig } from '../../src/lib/six-vertex/types';

describe('Initial States - DWBC Pattern Tests', () => {
  describe('DWBC High State (Figure 2)', () => {
    it('should generate correct pattern for N=6', () => {
      const state = generateDWBCHigh(6);

      // Expected pattern from Figure 2:
      // b1 b1 b1 b1 b1 c2
      // b1 b1 b1 b1 c2 b2
      // b1 b1 b1 c2 b2 b2
      // b1 b1 c2 b2 b2 b2
      // b1 c2 b2 b2 b2 b2
      // c2 b2 b2 b2 b2 b2

      // Check anti-diagonal has c2 vertices
      expect(state.vertices[0][5].type).toBe(VertexType.c2);
      expect(state.vertices[1][4].type).toBe(VertexType.c2);
      expect(state.vertices[2][3].type).toBe(VertexType.c2);
      expect(state.vertices[3][2].type).toBe(VertexType.c2);
      expect(state.vertices[4][1].type).toBe(VertexType.c2);
      expect(state.vertices[5][0].type).toBe(VertexType.c2);

      // Check upper-left triangle has b1 vertices
      expect(state.vertices[0][0].type).toBe(VertexType.b1);
      expect(state.vertices[0][1].type).toBe(VertexType.b1);
      expect(state.vertices[0][2].type).toBe(VertexType.b1);
      expect(state.vertices[1][0].type).toBe(VertexType.b1);
      expect(state.vertices[1][1].type).toBe(VertexType.b1);
      expect(state.vertices[2][0].type).toBe(VertexType.b1);

      // Check lower-right triangle has b2 vertices
      expect(state.vertices[5][5].type).toBe(VertexType.b2);
      expect(state.vertices[5][4].type).toBe(VertexType.b2);
      expect(state.vertices[5][3].type).toBe(VertexType.b2);
      expect(state.vertices[4][5].type).toBe(VertexType.b2);
      expect(state.vertices[4][4].type).toBe(VertexType.b2);
      expect(state.vertices[3][5].type).toBe(VertexType.b2);
    });

    it('should generate correct pattern for N=8', () => {
      const state = generateDWBCHigh(8);

      // Check dimensions
      expect(state.width).toBe(8);
      expect(state.height).toBe(8);
      expect(state.vertices).toHaveLength(8);
      expect(state.vertices[0]).toHaveLength(8);

      // Verify anti-diagonal pattern
      for (let i = 0; i < 8; i++) {
        expect(state.vertices[i][7 - i].type).toBe(VertexType.c2);
      }

      // Verify upper-left triangle
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (row + col < 7) {
            expect(state.vertices[row][col].type).toBe(VertexType.b1);
          }
        }
      }

      // Verify lower-right triangle
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (row + col > 7) {
            expect(state.vertices[row][col].type).toBe(VertexType.b2);
          }
        }
      }
    });

    it('should have correct boundary conditions', () => {
      const state = generateDWBCHigh(8);

      // Top boundary: all arrows point down (into lattice)
      for (let col = 0; col < 8; col++) {
        expect(state.verticalEdges[0][col]).toBe(EdgeState.In);
      }

      // Bottom boundary: all arrows point down (out of lattice)
      for (let col = 0; col < 8; col++) {
        expect(state.verticalEdges[8][col]).toBe(EdgeState.Out);
      }

      // Left boundary: all arrows point right (into lattice)
      for (let row = 0; row < 8; row++) {
        expect(state.horizontalEdges[row][0]).toBe(EdgeState.Out);
      }

      // Right boundary: all arrows point right (out of lattice)
      for (let row = 0; row < 8; row++) {
        expect(state.horizontalEdges[row][8]).toBe(EdgeState.In);
      }
    });

    it('should satisfy ice rule for all vertices', () => {
      const state = generateDWBCHigh(8);
      expect(validateIceRule(state)).toBe(true);
    });
  });

  describe('DWBC Low State (Figure 3)', () => {
    it('should generate correct pattern for N=6', () => {
      const state = generateDWBCLow(6);

      // Expected pattern from Figure 3:
      // c2 a1 a1 a1 a1 a1
      // a2 c2 a1 a1 a1 a1
      // a2 a2 c2 a1 a1 a1
      // a2 a2 a2 c2 a1 a1
      // a2 a2 a2 a2 c2 a1
      // a2 a2 a2 a2 a2 c2

      // Check main diagonal has c2 vertices
      expect(state.vertices[0][0].type).toBe(VertexType.c2);
      expect(state.vertices[1][1].type).toBe(VertexType.c2);
      expect(state.vertices[2][2].type).toBe(VertexType.c2);
      expect(state.vertices[3][3].type).toBe(VertexType.c2);
      expect(state.vertices[4][4].type).toBe(VertexType.c2);
      expect(state.vertices[5][5].type).toBe(VertexType.c2);

      // Check upper-right triangle has a1 vertices
      expect(state.vertices[0][1].type).toBe(VertexType.a1);
      expect(state.vertices[0][2].type).toBe(VertexType.a1);
      expect(state.vertices[0][3].type).toBe(VertexType.a1);
      expect(state.vertices[1][2].type).toBe(VertexType.a1);
      expect(state.vertices[1][3].type).toBe(VertexType.a1);
      expect(state.vertices[2][3].type).toBe(VertexType.a1);

      // Check lower-left triangle has a2 vertices
      expect(state.vertices[1][0].type).toBe(VertexType.a2);
      expect(state.vertices[2][0].type).toBe(VertexType.a2);
      expect(state.vertices[2][1].type).toBe(VertexType.a2);
      expect(state.vertices[3][0].type).toBe(VertexType.a2);
      expect(state.vertices[3][1].type).toBe(VertexType.a2);
      expect(state.vertices[3][2].type).toBe(VertexType.a2);
    });

    it('should generate correct pattern for N=8', () => {
      const state = generateDWBCLow(8);

      // Check dimensions
      expect(state.width).toBe(8);
      expect(state.height).toBe(8);
      expect(state.vertices).toHaveLength(8);
      expect(state.vertices[0]).toHaveLength(8);

      // Verify main diagonal pattern
      for (let i = 0; i < 8; i++) {
        expect(state.vertices[i][i].type).toBe(VertexType.c2);
      }

      // Verify upper-right triangle
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (col > row) {
            expect(state.vertices[row][col].type).toBe(VertexType.a1);
          }
        }
      }

      // Verify lower-left triangle
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (row > col) {
            expect(state.vertices[row][col].type).toBe(VertexType.a2);
          }
        }
      }
    });

    it('should have correct boundary conditions', () => {
      const state = generateDWBCLow(8);

      // Top boundary: all arrows point up (out of lattice)
      for (let col = 0; col < 8; col++) {
        expect(state.verticalEdges[0][col]).toBe(EdgeState.Out);
      }

      // Bottom boundary: all arrows point up (into lattice)
      for (let col = 0; col < 8; col++) {
        expect(state.verticalEdges[8][col]).toBe(EdgeState.In);
      }

      // Left boundary: all arrows point left (into boundary)
      for (let row = 0; row < 8; row++) {
        expect(state.horizontalEdges[row][0]).toBe(EdgeState.In);
      }

      // Right boundary: all arrows point left (out of boundary)
      for (let row = 0; row < 8; row++) {
        expect(state.horizontalEdges[row][8]).toBe(EdgeState.Out);
      }
    });

    it('should satisfy ice rule for all vertices', () => {
      const state = generateDWBCLow(8);
      expect(validateIceRule(state)).toBe(true);
    });
  });

  describe('Visual Smoke Tests for N=24', () => {
    it('should generate valid DWBC High state for N=24', () => {
      const state = generateDWBCHigh(24);

      expect(state.width).toBe(24);
      expect(state.height).toBe(24);

      // Verify anti-diagonal has c2 vertices
      for (let i = 0; i < 24; i++) {
        expect(state.vertices[i][23 - i].type).toBe(VertexType.c2);
      }

      // Sample check: upper-left corner should be b1
      expect(state.vertices[0][0].type).toBe(VertexType.b1);
      expect(state.vertices[5][5].type).toBe(VertexType.b1);

      // Sample check: lower-right corner should be b2
      expect(state.vertices[23][23].type).toBe(VertexType.b2);
      expect(state.vertices[18][18].type).toBe(VertexType.b2);

      // Must satisfy ice rule
      expect(validateIceRule(state)).toBe(true);
    });

    it('should generate valid DWBC Low state for N=24', () => {
      const state = generateDWBCLow(24);

      expect(state.width).toBe(24);
      expect(state.height).toBe(24);

      // Verify main diagonal has c2 vertices
      for (let i = 0; i < 24; i++) {
        expect(state.vertices[i][i].type).toBe(VertexType.c2);
      }

      // Sample check: upper-right should be a1
      expect(state.vertices[0][23].type).toBe(VertexType.a1);
      expect(state.vertices[5][18].type).toBe(VertexType.a1);

      // Sample check: lower-left should be a2
      expect(state.vertices[23][0].type).toBe(VertexType.a2);
      expect(state.vertices[18][5].type).toBe(VertexType.a2);

      // Must satisfy ice rule
      expect(validateIceRule(state)).toBe(true);
    });
  });

  describe('generateDWBCState wrapper', () => {
    it('should delegate to generateDWBCHigh for high type', () => {
      const config: DWBCConfig = { type: 'high' };
      const state = generateDWBCState(8, 8, config);

      // Should match direct call to generateDWBCHigh
      const directState = generateDWBCHigh(8);

      expect(state.width).toBe(directState.width);
      expect(state.height).toBe(directState.height);

      // Check a few vertices match
      expect(state.vertices[0][0].type).toBe(directState.vertices[0][0].type);
      expect(state.vertices[3][4].type).toBe(directState.vertices[3][4].type);
    });

    it('should delegate to generateDWBCLow for low type', () => {
      const config: DWBCConfig = { type: 'low' };
      const state = generateDWBCState(8, 8, config);

      // Should match direct call to generateDWBCLow
      const directState = generateDWBCLow(8);

      expect(state.width).toBe(directState.width);
      expect(state.height).toBe(directState.height);

      // Check a few vertices match
      expect(state.vertices[0][0].type).toBe(directState.vertices[0][0].type);
      expect(state.vertices[3][4].type).toBe(directState.vertices[3][4].type);
    });

    it('should handle non-square dimensions by using minimum', () => {
      const config: DWBCConfig = { type: 'high' };
      const state = generateDWBCState(10, 6, config);

      // Should use min(10, 6) = 6
      expect(state.width).toBe(6);
      expect(state.height).toBe(6);
    });
  });

  describe('Random Ice State Generation', () => {
    it('should generate valid ice configurations', () => {
      for (let i = 0; i < 5; i++) {
        const state = generateRandomIceState(8, 8, 12345 + i);
        expect(validateIceRule(state)).toBe(true);
      }
    });

    it('should be deterministic with same seed', () => {
      const state1 = generateRandomIceState(6, 6, 42);
      const state2 = generateRandomIceState(6, 6, 42);

      // Should generate identical states
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          expect(state1.vertices[row][col].type).toBe(state2.vertices[row][col].type);
        }
      }
    });

    it('should generate different states with different seeds', () => {
      const state1 = generateRandomIceState(6, 6, 42);
      const state2 = generateRandomIceState(6, 6, 43);

      // Should generate different states
      let differences = 0;
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          if (state1.vertices[row][col].type !== state2.vertices[row][col].type) {
            differences++;
          }
        }
      }

      expect(differences).toBeGreaterThan(0);
    });
  });

  describe('Uniform State Generation', () => {
    it('should attempt to create uniform patterns', () => {
      const state = generateUniformState(4, 4, VertexType.a1);

      expect(state.width).toBe(4);
      expect(state.height).toBe(4);

      // Should satisfy ice rule even if not perfectly uniform
      expect(validateIceRule(state)).toBe(true);
    });
  });

  describe('Ice Rule Validation', () => {
    it('should detect ice rule violations', () => {
      const state = generateDWBCHigh(4);

      // Manually break the ice rule
      state.vertices[1][1].configuration.left = EdgeState.In;
      state.vertices[1][1].configuration.right = EdgeState.In;
      state.vertices[1][1].configuration.top = EdgeState.In;
      state.vertices[1][1].configuration.bottom = EdgeState.In;

      // Create spy to suppress console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(validateIceRule(state)).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should validate correct configurations', () => {
      const testCases = [
        generateDWBCHigh(4),
        generateDWBCLow(4),
        generateRandomIceState(4, 4, 12345),
      ];

      for (const state of testCases) {
        expect(validateIceRule(state)).toBe(true);
      }
    });
  });

  describe('Snapshot Tests for Specific Patterns', () => {
    it('should match expected vertex type distribution for DWBC High N=8', () => {
      const state = generateDWBCHigh(8);

      // Count vertex types
      const typeCounts = new Map<VertexType, number>();
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const type = state.vertices[row][col].type;
          typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
        }
      }

      // Should have exactly 8 c2 vertices (on anti-diagonal)
      expect(typeCounts.get(VertexType.c2)).toBe(8);

      // Should have b1 in upper-left triangle: 1+2+3+4+5+6+7 = 28
      expect(typeCounts.get(VertexType.b1)).toBe(28);

      // Should have b2 in lower-right triangle: 28
      expect(typeCounts.get(VertexType.b2)).toBe(28);

      // Should have no a1, a2, or c1 vertices
      expect(typeCounts.get(VertexType.a1) || 0).toBe(0);
      expect(typeCounts.get(VertexType.a2) || 0).toBe(0);
      expect(typeCounts.get(VertexType.c1) || 0).toBe(0);
    });

    it('should match expected vertex type distribution for DWBC Low N=8', () => {
      const state = generateDWBCLow(8);

      // Count vertex types
      const typeCounts = new Map<VertexType, number>();
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const type = state.vertices[row][col].type;
          typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
        }
      }

      // Should have exactly 8 c2 vertices (on main diagonal)
      expect(typeCounts.get(VertexType.c2)).toBe(8);

      // Should have a1 in upper-right triangle: 28
      expect(typeCounts.get(VertexType.a1)).toBe(28);

      // Should have a2 in lower-left triangle: 28
      expect(typeCounts.get(VertexType.a2)).toBe(28);

      // Should have no b1, b2, or c1 vertices
      expect(typeCounts.get(VertexType.b1) || 0).toBe(0);
      expect(typeCounts.get(VertexType.b2) || 0).toBe(0);
      expect(typeCounts.get(VertexType.c1) || 0).toBe(0);
    });
  });
});
