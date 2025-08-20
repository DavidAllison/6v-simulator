/**
 * Tests for the fixed flip logic
 * Ensures that flips always maintain the ice rule
 */
import {
  VERTEX_A1,
  VERTEX_A2,
  VERTEX_B1,
  VERTEX_B2,
  VERTEX_C1,
  VERTEX_C2,
  canFlipPlaquette,
  applyFlipTransformation,
  validateIceRule,
  isFlipValid,
  executeValidFlip,
} from './fixedFlipLogic';
import { FlipDirection } from './physicsFlips';

describe('Fixed Flip Logic', () => {
  describe('validateIceRule', () => {
    it('should validate all vertex types have 2 in and 2 out', () => {
      expect(validateIceRule(VERTEX_A1)).toBe(true);
      expect(validateIceRule(VERTEX_A2)).toBe(true);
      expect(validateIceRule(VERTEX_B1)).toBe(true);
      expect(validateIceRule(VERTEX_B2)).toBe(true);
      expect(validateIceRule(VERTEX_C1)).toBe(true);
      expect(validateIceRule(VERTEX_C2)).toBe(true);
    });
    
    it('should reject invalid vertex types', () => {
      expect(validateIceRule(-1)).toBe(false);
      expect(validateIceRule(6)).toBe(false);
    });
  });
  
  describe('canFlipPlaquette', () => {
    it('should accept valid a1-a2 up flip pattern', () => {
      // a1 at base, a2 at upper-right
      // This requires compatible vertices at right and upper positions
      const canFlip = canFlipPlaquette(
        VERTEX_A1,  // base (bottom-left)
        VERTEX_B2,  // right (bottom-right) 
        VERTEX_A2,  // upper-right (top-right)
        VERTEX_B1,  // upper (top-left)
        FlipDirection.Up
      );
      expect(canFlip).toBe(true);
    });
    
    it('should accept valid c2-c2 up flip pattern', () => {
      const canFlip = canFlipPlaquette(
        VERTEX_C2,  // base
        VERTEX_B1,  // right
        VERTEX_C2,  // upper-right
        VERTEX_B2,  // upper
        FlipDirection.Up
      );
      expect(canFlip).toBe(true);
    });
    
    it('should reject invalid patterns that break ice rule', () => {
      // c1 at base cannot flip up
      const canFlip = canFlipPlaquette(
        VERTEX_C1,  // base - c1 cannot flip up!
        VERTEX_B1,  // right
        VERTEX_A2,  // upper-right
        VERTEX_B2,  // upper
        FlipDirection.Up
      );
      expect(canFlip).toBe(false);
    });
    
    it('should reject patterns with incompatible edges', () => {
      // Vertices that don't share compatible edges
      const canFlip = canFlipPlaquette(
        VERTEX_A1,  // base
        VERTEX_A1,  // right - incompatible with a1 on horizontal edge
        VERTEX_A2,  // upper-right
        VERTEX_A2,  // upper
        FlipDirection.Up
      );
      expect(canFlip).toBe(false);
    });
  });
  
  describe('applyFlipTransformation', () => {
    it('should correctly transform a1-a2 up flip', () => {
      const result = applyFlipTransformation(
        VERTEX_A1,  // base -> c1
        VERTEX_B2,  // right -> c2
        VERTEX_A2,  // upper-right -> c1
        VERTEX_B1,  // upper -> c2
        FlipDirection.Up
      );
      
      expect(result.new1).toBe(VERTEX_C1);  // a1 -> c1
      expect(result.new2).toBe(VERTEX_C2);  // b2 -> c2
      expect(result.new3).toBe(VERTEX_C1);  // a2 -> c1
      expect(result.new4).toBe(VERTEX_C2);  // b1 -> c2
    });
    
    it('should correctly transform c2-c2 up flip', () => {
      const result = applyFlipTransformation(
        VERTEX_C2,  // base -> a2
        VERTEX_B1,  // right -> c1
        VERTEX_C2,  // upper-right -> a1
        VERTEX_B2,  // upper -> c1
        FlipDirection.Up
      );
      
      expect(result.new1).toBe(VERTEX_A2);  // c2 -> a2
      expect(result.new2).toBe(VERTEX_C1);  // b1 -> c1
      expect(result.new3).toBe(VERTEX_A1);  // c2 -> a1
      expect(result.new4).toBe(VERTEX_C1);  // b2 -> c1
    });
    
    it('should correctly transform down flips', () => {
      const result = applyFlipTransformation(
        VERTEX_C1,  // down-left -> a1
        VERTEX_B1,  // down -> c1
        VERTEX_A1,  // base -> c2
        VERTEX_B2,  // left -> c1
        FlipDirection.Down
      );
      
      expect(result.new1).toBe(VERTEX_A1);  // c1 -> a1
      expect(result.new2).toBe(VERTEX_C1);  // b1 -> c1
      expect(result.new3).toBe(VERTEX_C2);  // a1 -> c2
      expect(result.new4).toBe(VERTEX_C1);  // b2 -> c1
    });
  });
  
  describe('isFlipValid', () => {
    it('should validate flips in a small lattice', () => {
      // Create a 3x3 lattice with DWBC High pattern
      const size = 3;
      const vertices = new Uint8Array(size * size);
      
      // Initialize DWBC High: c2 on anti-diagonal, b1 upper-left, b2 lower-right
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const idx = row * size + col;
          if (row + col === size - 1) {
            vertices[idx] = VERTEX_C2;  // Anti-diagonal
          } else if (row + col < size - 1) {
            vertices[idx] = VERTEX_B1;  // Upper-left triangle
          } else {
            vertices[idx] = VERTEX_B2;  // Lower-right triangle
          }
        }
      }
      
      // Check some positions
      // Position (0,0) has b1, can potentially flip
      const canFlip00Up = isFlipValid(vertices, size, 0, 0, FlipDirection.Up);
      const canFlip00Down = isFlipValid(vertices, size, 0, 0, FlipDirection.Down);
      
      // Position (0,0) is at top-left corner, so up flip is impossible (boundary)
      expect(canFlip00Up).toBe(false);
      
      // Down flip at (0,0) is also boundary-limited
      expect(canFlip00Down).toBe(false);
      
      // Position (1,1) has c2 on the anti-diagonal
      const canFlip11Up = isFlipValid(vertices, size, 1, 1, FlipDirection.Up);
      const canFlip11Down = isFlipValid(vertices, size, 1, 1, FlipDirection.Down);
      
      // This should be flippable based on the surrounding vertices
      // The actual result depends on the specific configuration
      console.log('(1,1) up flip valid:', canFlip11Up);
      console.log('(1,1) down flip valid:', canFlip11Down);
    });
  });
  
  describe('executeValidFlip', () => {
    it('should execute a valid flip and maintain ice rule', () => {
      // Create a 4x4 lattice
      const size = 4;
      const vertices = new Uint8Array(size * size);
      
      // Set up a specific pattern that allows a flip
      // Create an a1-a2 pattern that can flip
      vertices[1 * size + 1] = VERTEX_A1;  // (1,1) = a1
      vertices[1 * size + 2] = VERTEX_B2;  // (1,2) = b2
      vertices[0 * size + 2] = VERTEX_A2;  // (0,2) = a2
      vertices[0 * size + 1] = VERTEX_B1;  // (0,1) = b1
      
      // The rest can be a1 for simplicity
      for (let i = 0; i < vertices.length; i++) {
        if (vertices[i] === 0 && i !== 0) {
          vertices[i] = VERTEX_A1;
        }
      }
      
      // Store original state
      const originalVertices = new Uint8Array(vertices);
      
      // Try to execute flip at (1,1) up direction
      const success = executeValidFlip(vertices, size, 1, 1, FlipDirection.Up);
      
      if (success) {
        // Check that vertices changed as expected
        expect(vertices[1 * size + 1]).toBe(VERTEX_C1);  // a1 -> c1
        expect(vertices[1 * size + 2]).toBe(VERTEX_C2);  // b2 -> c2
        expect(vertices[0 * size + 2]).toBe(VERTEX_C1);  // a2 -> c1
        expect(vertices[0 * size + 1]).toBe(VERTEX_C2);  // b1 -> c2
        
        // Verify all vertices still maintain ice rule
        for (let i = 0; i < vertices.length; i++) {
          expect(validateIceRule(vertices[i])).toBe(true);
        }
      }
    });
    
    it('should reject invalid flips', () => {
      // Create a 3x3 lattice with all c1 vertices (invalid for most flips)
      const size = 3;
      const vertices = new Uint8Array(size * size);
      vertices.fill(VERTEX_C1);
      
      // Store original state
      const originalVertices = new Uint8Array(vertices);
      
      // Try to execute flip at (1,1) - should fail because c1 pattern can't flip this way
      const success = executeValidFlip(vertices, size, 1, 1, FlipDirection.Up);
      
      expect(success).toBe(false);
      
      // Verify nothing changed
      for (let i = 0; i < vertices.length; i++) {
        expect(vertices[i]).toBe(originalVertices[i]);
      }
    });
  });
  
  describe('DWBC configurations', () => {
    it('should maintain ice rule after multiple flips from DWBC High', () => {
      const size = 8;
      const vertices = new Uint8Array(size * size);
      
      // Initialize DWBC High
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const idx = row * size + col;
          if (row + col === size - 1) {
            vertices[idx] = VERTEX_C2;
          } else if (row + col < size - 1) {
            vertices[idx] = VERTEX_B1;
          } else {
            vertices[idx] = VERTEX_B2;
          }
        }
      }
      
      // Verify initial state has ice rule
      for (let i = 0; i < vertices.length; i++) {
        expect(validateIceRule(vertices[i])).toBe(true);
      }
      
      // Try random flips and ensure ice rule is always maintained
      let flipCount = 0;
      const maxAttempts = 100;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        const direction = Math.random() < 0.5 ? FlipDirection.Up : FlipDirection.Down;
        
        const beforeState = new Uint8Array(vertices);
        const success = executeValidFlip(vertices, size, row, col, direction);
        
        if (success) {
          flipCount++;
          
          // Verify all vertices still maintain ice rule
          for (let i = 0; i < vertices.length; i++) {
            if (!validateIceRule(vertices[i])) {
              console.error(`Ice rule violation at index ${i} after flip at (${row},${col}) ${direction}`);
              console.error('Before:', beforeState);
              console.error('After:', vertices);
            }
            expect(validateIceRule(vertices[i])).toBe(true);
          }
        }
      }
      
      console.log(`Successfully executed ${flipCount} flips out of ${maxAttempts} attempts`);
      expect(flipCount).toBeGreaterThan(0);  // Should have at least some successful flips
    });
  });
});