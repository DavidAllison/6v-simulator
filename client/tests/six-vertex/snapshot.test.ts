/**
 * Snapshot tests for DWBC patterns and visual regression
 * Verifies exact patterns match paper figures
 */

import {
  generateDWBCHigh,
  generateDWBCLow,
  generateRandomIceState,
  validateIceRule,
} from '../../src/lib/six-vertex/initialStates';
import { VertexType, LatticeState } from '../../src/lib/six-vertex/types';
import { getVertexASCII } from '../../src/lib/six-vertex/vertexShapes';

/**
 * Generate ASCII representation of lattice state for visual verification
 */
function generateLatticeASCII(state: LatticeState): string {
  const lines: string[] = [];
  lines.push(`Lattice ${state.width}x${state.height}:`);

  for (let row = 0; row < state.height; row++) {
    let line = '';
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];
      // Use simple character representation
      switch (vertex.type) {
        case VertexType.a1:
          line += 'A ';
          break;
        case VertexType.a2:
          line += 'a ';
          break;
        case VertexType.b1:
          line += 'B ';
          break;
        case VertexType.b2:
          line += 'b ';
          break;
        case VertexType.c1:
          line += 'C ';
          break;
        case VertexType.c2:
          line += 'c ';
          break;
        default:
          line += '? ';
          break;
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Generate detailed pattern representation
 */
function generateDetailedPattern(state: LatticeState): string[][] {
  const pattern: string[][] = [];

  for (let row = 0; row < state.height; row++) {
    pattern[row] = [];
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];
      pattern[row][col] = vertex.type;
    }
  }

  return pattern;
}

describe('DWBC Pattern Snapshot Tests', () => {
  describe('DWBC High Pattern (Figure 2)', () => {
    it('should match exact pattern for N=8', () => {
      const state = generateDWBCHigh(8);
      const pattern = generateDetailedPattern(state);

      // Expected pattern for N=8 DWBC High
      // Anti-diagonal should have c2 vertices
      // Upper-left triangle should have b1 vertices
      // Lower-right triangle should have b2 vertices

      const expectedAntiDiagonal = [
        { row: 0, col: 7, type: VertexType.c2 },
        { row: 1, col: 6, type: VertexType.c2 },
        { row: 2, col: 5, type: VertexType.c2 },
        { row: 3, col: 4, type: VertexType.c2 },
        { row: 4, col: 3, type: VertexType.c2 },
        { row: 5, col: 2, type: VertexType.c2 },
        { row: 6, col: 1, type: VertexType.c2 },
        { row: 7, col: 0, type: VertexType.c2 },
      ];

      // Verify anti-diagonal
      for (const { row, col, type } of expectedAntiDiagonal) {
        expect(pattern[row][col]).toBe(type);
      }

      // Verify upper-left triangle (sample check)
      const upperLeftSamples = [
        { row: 0, col: 0, type: VertexType.b1 },
        { row: 0, col: 3, type: VertexType.b1 },
        { row: 2, col: 1, type: VertexType.b1 },
        { row: 3, col: 3, type: VertexType.b1 },
      ];

      for (const { row, col, type } of upperLeftSamples) {
        expect(pattern[row][col]).toBe(type);
      }

      // Verify lower-right triangle (sample check)
      const lowerRightSamples = [
        { row: 7, col: 7, type: VertexType.b2 },
        { row: 7, col: 4, type: VertexType.b2 },
        { row: 5, col: 6, type: VertexType.b2 },
        { row: 4, col: 4, type: VertexType.b2 },
      ];

      for (const { row, col, type } of lowerRightSamples) {
        expect(pattern[row][col]).toBe(type);
      }

      // Store snapshot for visual comparison
      const ascii = generateLatticeASCII(state);
      expect(ascii).toMatchSnapshot('DWBC_High_N8');
    });

    it('should generate correct diagonal pattern for N=24', () => {
      const state = generateDWBCHigh(24);

      // Verify diagonal pattern structure
      let diagonalCorrect = true;
      for (let i = 0; i < 24; i++) {
        if (state.vertices[i][23 - i].type !== VertexType.c2) {
          diagonalCorrect = false;
          break;
        }
      }

      expect(diagonalCorrect).toBe(true);

      // Verify regions
      // Sample upper-left region
      const upperLeftRegion = [];
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          if (row + col < 10) {
            upperLeftRegion.push(state.vertices[row][col].type);
          }
        }
      }

      const b1Count = upperLeftRegion.filter((t) => t === VertexType.b1).length;
      expect(b1Count).toBe(upperLeftRegion.length);

      // Sample lower-right region
      const lowerRightRegion = [];
      for (let row = 14; row < 24; row++) {
        for (let col = 14; col < 24; col++) {
          if (row + col > 23) {
            lowerRightRegion.push(state.vertices[row][col].type);
          }
        }
      }

      const b2Count = lowerRightRegion.filter((t) => t === VertexType.b2).length;
      expect(b2Count).toBe(lowerRightRegion.length);
    });
  });

  describe('DWBC Low Pattern (Figure 3)', () => {
    it('should match exact pattern for N=8', () => {
      const state = generateDWBCLow(8);
      const pattern = generateDetailedPattern(state);

      // Expected pattern for N=8 DWBC Low
      // Main diagonal should have c2 vertices
      // Upper-right triangle should have a1 vertices
      // Lower-left triangle should have a2 vertices

      const expectedMainDiagonal = [
        { row: 0, col: 0, type: VertexType.c2 },
        { row: 1, col: 1, type: VertexType.c2 },
        { row: 2, col: 2, type: VertexType.c2 },
        { row: 3, col: 3, type: VertexType.c2 },
        { row: 4, col: 4, type: VertexType.c2 },
        { row: 5, col: 5, type: VertexType.c2 },
        { row: 6, col: 6, type: VertexType.c2 },
        { row: 7, col: 7, type: VertexType.c2 },
      ];

      // Verify main diagonal
      for (const { row, col, type } of expectedMainDiagonal) {
        expect(pattern[row][col]).toBe(type);
      }

      // Verify upper-right triangle (sample check)
      const upperRightSamples = [
        { row: 0, col: 1, type: VertexType.a1 },
        { row: 0, col: 7, type: VertexType.a1 },
        { row: 2, col: 5, type: VertexType.a1 },
        { row: 3, col: 4, type: VertexType.a1 },
      ];

      for (const { row, col, type } of upperRightSamples) {
        expect(pattern[row][col]).toBe(type);
      }

      // Verify lower-left triangle (sample check)
      const lowerLeftSamples = [
        { row: 7, col: 0, type: VertexType.a2 },
        { row: 7, col: 3, type: VertexType.a2 },
        { row: 5, col: 1, type: VertexType.a2 },
        { row: 4, col: 3, type: VertexType.a2 },
      ];

      for (const { row, col, type } of lowerLeftSamples) {
        expect(pattern[row][col]).toBe(type);
      }

      // Store snapshot for visual comparison
      const ascii = generateLatticeASCII(state);
      expect(ascii).toMatchSnapshot('DWBC_Low_N8');
    });

    it('should generate correct diagonal pattern for N=24', () => {
      const state = generateDWBCLow(24);

      // Verify diagonal pattern structure
      let diagonalCorrect = true;
      for (let i = 0; i < 24; i++) {
        if (state.vertices[i][i].type !== VertexType.c2) {
          diagonalCorrect = false;
          break;
        }
      }

      expect(diagonalCorrect).toBe(true);

      // Verify regions
      // Sample upper-right region
      const upperRightRegion = [];
      for (let row = 0; row < 10; row++) {
        for (let col = 14; col < 24; col++) {
          if (col > row + 10) {
            upperRightRegion.push(state.vertices[row][col].type);
          }
        }
      }

      const a1Count = upperRightRegion.filter((t) => t === VertexType.a1).length;
      expect(a1Count).toBe(upperRightRegion.length);

      // Sample lower-left region
      const lowerLeftRegion = [];
      for (let row = 14; row < 24; row++) {
        for (let col = 0; col < 10; col++) {
          if (row > col + 10) {
            lowerLeftRegion.push(state.vertices[row][col].type);
          }
        }
      }

      const a2Count = lowerLeftRegion.filter((t) => t === VertexType.a2).length;
      expect(a2Count).toBe(lowerLeftRegion.length);
    });
  });

  describe('Pattern Row/Column Verification', () => {
    it('should have expected vertex types in specific rows for DWBC High', () => {
      const state = generateDWBCHigh(8);

      // Row 0 should have b1 vertices except at column 7 (c2)
      const row0 = state.vertices[0];
      for (let col = 0; col < 7; col++) {
        expect(row0[col].type).toBe(VertexType.b1);
      }
      expect(row0[7].type).toBe(VertexType.c2);

      // Row 7 should have b2 vertices except at column 0 (c2)
      const row7 = state.vertices[7];
      expect(row7[0].type).toBe(VertexType.c2);
      for (let col = 1; col < 8; col++) {
        expect(row7[col].type).toBe(VertexType.b2);
      }

      // Column 0 should have b1 vertices in upper half, c2 at row 7, b2 in lower half
      for (let row = 0; row < 7; row++) {
        expect(state.vertices[row][0].type).toBe(VertexType.b1);
      }
      expect(state.vertices[7][0].type).toBe(VertexType.c2);

      // Column 7 should have c2 at row 0, b2 vertices in rest
      expect(state.vertices[0][7].type).toBe(VertexType.c2);
      for (let row = 1; row < 8; row++) {
        expect(state.vertices[row][7].type).toBe(VertexType.b2);
      }
    });

    it('should have expected vertex types in specific rows for DWBC Low', () => {
      const state = generateDWBCLow(8);

      // Row 0 should have c2 at column 0, then a1 vertices
      expect(state.vertices[0][0].type).toBe(VertexType.c2);
      for (let col = 1; col < 8; col++) {
        expect(state.vertices[0][col].type).toBe(VertexType.a1);
      }

      // Row 7 should have a2 vertices except c2 at column 7
      for (let col = 0; col < 7; col++) {
        expect(state.vertices[7][col].type).toBe(VertexType.a2);
      }
      expect(state.vertices[7][7].type).toBe(VertexType.c2);

      // Column 0 should have c2 at row 0, then a2 vertices
      expect(state.vertices[0][0].type).toBe(VertexType.c2);
      for (let row = 1; row < 8; row++) {
        expect(state.vertices[row][0].type).toBe(VertexType.a2);
      }

      // Column 7 should have a1 vertices except c2 at row 7
      for (let row = 0; row < 7; row++) {
        expect(state.vertices[row][7].type).toBe(VertexType.a1);
      }
      expect(state.vertices[7][7].type).toBe(VertexType.c2);
    });
  });

  describe('Ice Rule Verification in Patterns', () => {
    it('should maintain ice rule in all DWBC patterns', () => {
      const sizes = [4, 6, 8, 12, 16, 24];

      for (const size of sizes) {
        const highState = generateDWBCHigh(size);
        const lowState = generateDWBCLow(size);

        expect(validateIceRule(highState)).toBe(true);
        expect(validateIceRule(lowState)).toBe(true);
      }
    });

    it('should have correct edge configuration at boundaries', () => {
      const state = generateDWBCHigh(6);

      // Check corner vertices satisfy ice rule with boundary
      const topLeft = state.vertices[0][0];
      const topRight = state.vertices[0][5];
      const bottomLeft = state.vertices[5][0];
      const bottomRight = state.vertices[5][5];

      // Each corner should still have 2 in, 2 out counting boundary edges
      expect(topLeft.type).toBe(VertexType.b1);
      expect(topRight.type).toBe(VertexType.c2);
      expect(bottomLeft.type).toBe(VertexType.c2);
      expect(bottomRight.type).toBe(VertexType.b2);
    });
  });

  describe('Pattern Consistency', () => {
    it('should generate identical patterns for same size', () => {
      const state1 = generateDWBCHigh(10);
      const state2 = generateDWBCHigh(10);

      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          expect(state1.vertices[row][col].type).toBe(state2.vertices[row][col].type);
        }
      }
    });

    it('should scale patterns correctly', () => {
      // Smaller patterns should be subsets of larger ones
      const small = generateDWBCHigh(4);
      const large = generateDWBCHigh(8);

      // The pattern structure should be consistent
      // Anti-diagonal in both should have c2
      expect(small.vertices[0][3].type).toBe(VertexType.c2);
      expect(large.vertices[0][7].type).toBe(VertexType.c2);

      expect(small.vertices[3][0].type).toBe(VertexType.c2);
      expect(large.vertices[7][0].type).toBe(VertexType.c2);
    });
  });

  describe('Visual Pattern ASCII Generation', () => {
    it('should generate readable ASCII representation', () => {
      const state = generateDWBCHigh(4);
      const ascii = generateLatticeASCII(state);

      expect(ascii).toContain('Lattice 4x4:');
      expect(ascii.split('\n')).toHaveLength(5); // Title + 4 rows

      // Each row should have 4 vertices represented
      const lines = ascii.split('\n');
      for (let i = 1; i <= 4; i++) {
        const vertices = lines[i].trim().split(/\s+/);
        expect(vertices).toHaveLength(4);
      }
    });

    it('should use consistent notation for vertex types', () => {
      const state = generateDWBCLow(4);
      const ascii = generateLatticeASCII(state);

      // Should contain expected characters
      expect(ascii).toMatch(/[AaBbCc]/);

      // Count vertex representations
      const charCounts: Record<string, number> = {};
      for (const char of ascii.replace(/[^AaBbCc]/g, '')) {
        charCounts[char] = (charCounts[char] || 0) + 1;
      }

      // Total should be 16 (4x4)
      const total = Object.values(charCounts).reduce((a, b) => a + b, 0);
      expect(total).toBe(16);
    });
  });
});
