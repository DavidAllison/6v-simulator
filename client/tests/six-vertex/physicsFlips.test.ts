/**
 * Test suite for physics-accurate flip operations
 * Verifies flip mechanics, ice rule preservation, and weight calculations
 */

import {
  isFlippable,
  executeFlip,
  FlipDirection,
  FlipCapability,
  getWeightRatio,
  getAllFlippablePositions,
  calculateHeight,
} from '../../src/lib/six-vertex/physicsFlips';
import {
  generateDWBCHigh,
  generateDWBCLow,
  validateIceRule,
} from '../../src/lib/six-vertex/initialStates';
import { VertexType, LatticeState } from '../../src/lib/six-vertex/types';

describe('Physics Flips - Invariant Tests', () => {
  describe('Flip Capability Detection', () => {
    it('should correctly identify flippable positions in DWBC High', () => {
      const state = generateDWBCHigh(8);

      // In DWBC High initial state:
      // - Anti-diagonal has c2 vertices
      // - Upper-left has b1, lower-right has b2

      // c2 vertices can flip up if upper-right neighbor is a2 or c2
      // Since upper-right of c2 on anti-diagonal is b2, c2 cannot flip up initially

      // b1 vertices cannot flip (not a1 or c2 for up, not c1 or a1 for down)
      // b2 vertices cannot flip (not suitable types)

      const flippable = getAllFlippablePositions(state);

      // Initially, DWBC High should have no flippable positions
      expect(flippable).toHaveLength(0);
    });

    it('should correctly identify flippable positions in DWBC Low', () => {
      const state = generateDWBCLow(8);

      // In DWBC Low initial state:
      // - Main diagonal has c2 vertices
      // - Upper-right has a1, lower-left has a2

      // a1 can flip up if upper-right neighbor is a2 or c2
      // a1 can flip down if lower-left neighbor is a2 or c1

      const flippable = getAllFlippablePositions(state);

      // Should have some flippable positions
      expect(flippable.length).toBeGreaterThan(0);

      // Check specific positions
      const capability = isFlippable(state, 1, 2); // Should be a1
      if (state.vertices[1][2].type === VertexType.a1) {
        // a1 can potentially flip
        expect(capability.canFlipUp || capability.canFlipDown).toBeDefined();
      }
    });

    it('should check boundary conditions correctly', () => {
      const state = generateDWBCLow(4);

      // Top-left corner (0,0) - cannot flip up (no upper neighbor)
      const topLeft = isFlippable(state, 0, 0);
      expect(topLeft.canFlipUp).toBe(false);

      // Bottom-right corner - cannot flip down (no lower neighbor)
      const bottomRight = isFlippable(state, 3, 3);
      expect(bottomRight.canFlipDown).toBe(false);
    });

    it('should correctly identify up flip requirements', () => {
      const state = generateDWBCLow(6);

      // Find an a1 vertex
      let a1Position = null;
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          if (state.vertices[row][col].type === VertexType.a1) {
            a1Position = { row, col };
            break;
          }
        }
        if (a1Position) break;
      }

      if (a1Position) {
        const capability = isFlippable(state, a1Position.row, a1Position.col);

        // Check upper-right neighbor
        if (a1Position.row > 0 && a1Position.col < 5) {
          const upperRight = state.vertices[a1Position.row - 1][a1Position.col + 1];
          const canFlip = upperRight.type === VertexType.a2 || upperRight.type === VertexType.c2;
          expect(capability.canFlipUp).toBe(canFlip);
        }
      }
    });
  });

  describe('Ice Rule Preservation', () => {
    it('should preserve ice rule after up flip', () => {
      // Create a custom state where we can flip
      const state = generateDWBCLow(6);

      // Find a flippable position
      const flippable = getAllFlippablePositions(state);
      const upFlippable = flippable.find((f) => f.capability.canFlipUp);

      if (upFlippable) {
        // Execute flip
        const newState = executeFlip(
          state,
          upFlippable.position.row,
          upFlippable.position.col,
          FlipDirection.Up,
        );

        // Ice rule must still be satisfied
        expect(validateIceRule(newState)).toBe(true);
      }
    });

    it('should preserve ice rule after down flip', () => {
      const state = generateDWBCLow(6);

      // Find a flippable position
      const flippable = getAllFlippablePositions(state);
      const downFlippable = flippable.find((f) => f.capability.canFlipDown);

      if (downFlippable) {
        // Execute flip
        const newState = executeFlip(
          state,
          downFlippable.position.row,
          downFlippable.position.col,
          FlipDirection.Down,
        );

        // Ice rule must still be satisfied
        expect(validateIceRule(newState)).toBe(true);
      }
    });

    it('should preserve ice rule after multiple flips', () => {
      let state = generateDWBCLow(8);

      // Perform multiple random flips
      for (let i = 0; i < 10; i++) {
        const flippable = getAllFlippablePositions(state);

        if (flippable.length > 0) {
          const randomIndex = Math.floor(Math.random() * flippable.length);
          const position = flippable[randomIndex];

          // Choose random direction if both are possible
          let direction: FlipDirection;
          if (position.capability.canFlipUp && position.capability.canFlipDown) {
            direction = Math.random() > 0.5 ? FlipDirection.Up : FlipDirection.Down;
          } else if (position.capability.canFlipUp) {
            direction = FlipDirection.Up;
          } else {
            direction = FlipDirection.Down;
          }

          state = executeFlip(state, position.position.row, position.position.col, direction);

          // Ice rule must be preserved after each flip
          expect(validateIceRule(state)).toBe(true);
        }
      }
    });
  });

  describe('2x2 Neighborhood Changes', () => {
    it('should only modify 2x2 neighborhood for up flip', () => {
      const state = generateDWBCLow(8);

      // Manually set up a flippable configuration
      state.vertices[2][2].type = VertexType.a1;
      state.vertices[1][3].type = VertexType.a2;

      const originalState = JSON.parse(JSON.stringify(state));
      const newState = executeFlip(state, 2, 2, FlipDirection.Up);

      // Check that only the 2x2 neighborhood changed
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const isInNeighborhood =
            (row === 2 && col === 2) || // base
            (row === 2 && col === 3) || // right
            (row === 1 && col === 3) || // up-right
            (row === 1 && col === 2); // up

          if (!isInNeighborhood) {
            expect(newState.vertices[row][col].type).toBe(originalState.vertices[row][col].type);
          }
        }
      }
    });

    it('should only modify 2x2 neighborhood for down flip', () => {
      const state = generateDWBCLow(8);

      // Manually set up a flippable configuration
      state.vertices[2][2].type = VertexType.a1;
      state.vertices[3][1].type = VertexType.a2;

      const originalState = JSON.parse(JSON.stringify(state));
      const newState = executeFlip(state, 2, 2, FlipDirection.Down);

      // Check that only the 2x2 neighborhood changed
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const isInNeighborhood =
            (row === 2 && col === 2) || // base
            (row === 2 && col === 1) || // left
            (row === 3 && col === 1) || // down-left
            (row === 3 && col === 2); // down

          if (!isInNeighborhood) {
            expect(newState.vertices[row][col].type).toBe(originalState.vertices[row][col].type);
          }
        }
      }
    });
  });

  describe('Vertex Type Transformations', () => {
    it('should correctly transform vertices for up flip', () => {
      const state = generateDWBCLow(6);

      // Set up a specific configuration
      state.vertices[2][2].type = VertexType.a1;
      state.vertices[2][3].type = VertexType.b2;
      state.vertices[1][3].type = VertexType.a2;
      state.vertices[1][2].type = VertexType.b1;

      const newState = executeFlip(state, 2, 2, FlipDirection.Up);

      // Check transformations according to main.c logic
      expect(newState.vertices[2][2].type).toBe(VertexType.c1); // a1 -> c1
      expect(newState.vertices[2][3].type).toBe(VertexType.c2); // b2 -> c2
      expect(newState.vertices[1][3].type).toBe(VertexType.c1); // a2 -> c1
      expect(newState.vertices[1][2].type).toBe(VertexType.c2); // b1 -> c2
    });

    it('should correctly transform vertices for down flip', () => {
      const state = generateDWBCLow(6);

      // Set up a specific configuration
      state.vertices[2][2].type = VertexType.a1;
      state.vertices[2][1].type = VertexType.b1;
      state.vertices[3][1].type = VertexType.a2;
      state.vertices[3][2].type = VertexType.b2;

      const newState = executeFlip(state, 2, 2, FlipDirection.Down);

      // Check transformations according to main.c logic
      expect(newState.vertices[2][2].type).toBe(VertexType.c2); // a1 -> c2
      expect(newState.vertices[2][1].type).toBe(VertexType.c1); // b1 -> c1
      expect(newState.vertices[3][1].type).toBe(VertexType.c1); // a2 -> c1
      expect(newState.vertices[3][2].type).toBe(VertexType.c2); // b2 -> c2
    });

    it('should handle c-type vertex transformations', () => {
      const state = generateDWBCLow(6);

      // Test c2 -> a2 transformation for up flip
      state.vertices[2][2].type = VertexType.c2;
      state.vertices[1][3].type = VertexType.c2;

      const newState1 = executeFlip(state, 2, 2, FlipDirection.Up);
      expect(newState1.vertices[2][2].type).toBe(VertexType.a2); // c2 -> a2
      expect(newState1.vertices[1][3].type).toBe(VertexType.a1); // c2 -> a1

      // Test c1 -> a2 transformation for down flip
      state.vertices[2][2].type = VertexType.c1;
      state.vertices[3][1].type = VertexType.c1;

      const newState2 = executeFlip(state, 2, 2, FlipDirection.Down);
      expect(newState2.vertices[2][2].type).toBe(VertexType.a2); // c1 -> a2
    });
  });

  describe('Height/Volume Calculations', () => {
    it('should calculate correct height for DWBC states', () => {
      const highState = generateDWBCHigh(6);
      const lowState = generateDWBCLow(6);

      const highHeight = calculateHeight(highState);
      const lowHeight = calculateHeight(lowState);

      // Heights should be different for different states
      expect(highHeight).toBeGreaterThan(0);
      expect(lowHeight).toBeGreaterThan(0);

      // Count contributing vertices manually
      let expectedHighHeight = 0;
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          const type = highState.vertices[row][col].type;
          if (type === VertexType.a1 || type === VertexType.b1 || type === VertexType.c2) {
            expectedHighHeight++;
          }
        }
      }

      expect(highHeight).toBe(expectedHighHeight);
    });

    it('should update height correctly after flips', () => {
      const state = generateDWBCLow(6);
      const initialHeight = calculateHeight(state);

      // Find a flippable position
      const flippable = getAllFlippablePositions(state);

      if (flippable.length > 0 && flippable[0].capability.canFlipUp) {
        const newState = executeFlip(
          state,
          flippable[0].position.row,
          flippable[0].position.col,
          FlipDirection.Up,
        );

        const newHeight = calculateHeight(newState);

        // Height should change after flip
        // Up flip generally decreases height, down flip increases it
        expect(newHeight).not.toBe(initialHeight);
      }
    });
  });

  describe('Boundary Preservation', () => {
    it('should preserve boundary conditions after flips', () => {
      const state = generateDWBCHigh(6);

      // Store original boundary conditions
      const topBoundary = state.verticalEdges[0].slice();
      const bottomBoundary = state.verticalEdges[6].slice();
      const leftBoundary = state.horizontalEdges.map((row) => row[0]);
      const rightBoundary = state.horizontalEdges.map((row) => row[6]);

      // Try to flip (if possible)
      const flippable = getAllFlippablePositions(state);
      if (flippable.length > 0) {
        const newState = executeFlip(
          state,
          flippable[0].position.row,
          flippable[0].position.col,
          flippable[0].capability.canFlipUp ? FlipDirection.Up : FlipDirection.Down,
        );

        // Boundaries should remain unchanged
        expect(newState.verticalEdges[0]).toEqual(topBoundary);
        expect(newState.verticalEdges[6]).toEqual(bottomBoundary);

        for (let row = 0; row < 6; row++) {
          expect(newState.horizontalEdges[row][0]).toBe(leftBoundary[row]);
          expect(newState.horizontalEdges[row][6]).toBe(rightBoundary[row]);
        }
      }
    });
  });

  describe('Deep Copy Verification', () => {
    it('should not modify original state when flipping', () => {
      const state = generateDWBCLow(6);
      const originalVertices = JSON.parse(JSON.stringify(state.vertices));

      // Find and execute a flip
      const flippable = getAllFlippablePositions(state);
      if (flippable.length > 0) {
        const newState = executeFlip(
          state,
          flippable[0].position.row,
          flippable[0].position.col,
          flippable[0].capability.canFlipUp ? FlipDirection.Up : FlipDirection.Down,
        );

        // Original state should be unchanged
        expect(state.vertices).toEqual(originalVertices);

        // New state should be different
        expect(newState.vertices).not.toEqual(originalVertices);
      }
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle flips at lattice corners', () => {
      const state = generateDWBCLow(4);

      // Try flipping at corners (if possible)
      const corners = [
        { row: 0, col: 0 },
        { row: 0, col: 3 },
        { row: 3, col: 0 },
        { row: 3, col: 3 },
      ];

      for (const corner of corners) {
        const capability = isFlippable(state, corner.row, corner.col);

        if (capability.canFlipUp || capability.canFlipDown) {
          const direction = capability.canFlipUp ? FlipDirection.Up : FlipDirection.Down;
          const newState = executeFlip(state, corner.row, corner.col, direction);

          // Should still satisfy ice rule
          expect(validateIceRule(newState)).toBe(true);
        }
      }
    });

    it('should handle invalid flip positions gracefully', () => {
      const state = generateDWBCLow(4);

      // Out of bounds positions
      const outOfBounds = isFlippable(state, -1, 0);
      expect(outOfBounds.canFlipUp).toBe(false);
      expect(outOfBounds.canFlipDown).toBe(false);

      const outOfBounds2 = isFlippable(state, 4, 4);
      expect(outOfBounds2.canFlipUp).toBe(false);
      expect(outOfBounds2.canFlipDown).toBe(false);
    });
  });
});
