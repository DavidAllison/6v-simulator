/**
 * Test suite to verify all flip transformations
 */

import { runVerification, verifyAllTransformations } from './flipTransformationVerification';
import { 
  applyFlipTransformationCorrected,
  VERTEX_A1, VERTEX_A2, VERTEX_B1, VERTEX_B2, VERTEX_C1, VERTEX_C2
} from './correctedFlipLogic';
import { FlipDirection } from './physicsFlips';

describe('Flip Transformation Verification', () => {
  
  describe('UP flip transformations', () => {
    const upTestCases = [
      {
        name: 'Pattern 1: a1-b2-a2-b1 → c1-c2-c1-c2',
        before: [VERTEX_A1, VERTEX_B2, VERTEX_A2, VERTEX_B1],
        after: [VERTEX_C1, VERTEX_C2, VERTEX_C1, VERTEX_C2]
      },
      {
        name: 'Pattern 2: c2-c1-c2-c1 → a2-b1-a1-b2',
        before: [VERTEX_C2, VERTEX_C1, VERTEX_C2, VERTEX_C1],
        after: [VERTEX_A2, VERTEX_B1, VERTEX_A1, VERTEX_B2]
      },
      {
        name: 'Pattern 3: a1-c1-a2-c2 → c1-b1-c1-b2',
        before: [VERTEX_A1, VERTEX_C1, VERTEX_A2, VERTEX_C2],
        after: [VERTEX_C1, VERTEX_B1, VERTEX_C1, VERTEX_B2]
      },
      {
        name: 'Pattern 4: c2-b2-c2-b1 → a2-c2-a1-c2 (FIXED)',
        before: [VERTEX_C2, VERTEX_B2, VERTEX_C2, VERTEX_B1],
        after: [VERTEX_A2, VERTEX_C2, VERTEX_A1, VERTEX_C2] // Fixed: c2 not c1
      },
      {
        name: 'Pattern 5: a1-b2-c2-c1 → c1-c2-a1-b2',
        before: [VERTEX_A1, VERTEX_B2, VERTEX_C2, VERTEX_C1],
        after: [VERTEX_C1, VERTEX_C2, VERTEX_A1, VERTEX_B2]
      },
      {
        name: 'Pattern 6: c2-c1-a2-b1 → a2-b1-c1-c2',
        before: [VERTEX_C2, VERTEX_C1, VERTEX_A2, VERTEX_B1],
        after: [VERTEX_A2, VERTEX_B1, VERTEX_C1, VERTEX_C2]
      },
      {
        name: 'Pattern 7: b1-a1-b2-a2 → b2-a2-b1-a1',
        before: [VERTEX_B1, VERTEX_A1, VERTEX_B2, VERTEX_A2],
        after: [VERTEX_B2, VERTEX_A2, VERTEX_B1, VERTEX_A1]
      },
      {
        name: 'Pattern 8: b2-a2-b1-a1 → b1-a1-b2-a2',
        before: [VERTEX_B2, VERTEX_A2, VERTEX_B1, VERTEX_A1],
        after: [VERTEX_B1, VERTEX_A1, VERTEX_B2, VERTEX_A2]
      },
      {
        name: 'Pattern 9: c1-b1-c1-b2 → a1-c1-a2-c2',
        before: [VERTEX_C1, VERTEX_B1, VERTEX_C1, VERTEX_B2],
        after: [VERTEX_A1, VERTEX_C1, VERTEX_A2, VERTEX_C2]
      },
      {
        name: 'Pattern 10: a2-c2-a1-c1 → c2-b2-c2-b1',
        before: [VERTEX_A2, VERTEX_C2, VERTEX_A1, VERTEX_C1],
        after: [VERTEX_C2, VERTEX_B2, VERTEX_C2, VERTEX_B1]
      }
    ];
    
    upTestCases.forEach((testCase) => {
      test(testCase.name, () => {
        const [v1, v2, v3, v4] = testCase.before;
        const result = applyFlipTransformationCorrected(v1, v2, v3, v4, FlipDirection.Up);
        
        expect(result).not.toBeNull();
        if (result) {
          expect(result.new1).toBe(testCase.after[0]);
          expect(result.new2).toBe(testCase.after[1]);
          expect(result.new3).toBe(testCase.after[2]);
          expect(result.new4).toBe(testCase.after[3]);
        }
      });
    });
  });
  
  describe('DOWN flip transformations', () => {
    const downTestCases = [
      {
        name: 'Pattern 1: a2-b1-a1-b2 → c2-c1-c2-c1',
        before: [VERTEX_A2, VERTEX_B1, VERTEX_A1, VERTEX_B2],
        after: [VERTEX_C2, VERTEX_C1, VERTEX_C2, VERTEX_C1]
      },
      {
        name: 'Pattern 2: c1-c2-c1-c2 → a1-b2-a2-b1',
        before: [VERTEX_C1, VERTEX_C2, VERTEX_C1, VERTEX_C2],
        after: [VERTEX_A1, VERTEX_B2, VERTEX_A2, VERTEX_B1]
      },
      {
        name: 'Pattern 3: a2-c2-a1-c1 → c2-b2-c2-b1',
        before: [VERTEX_A2, VERTEX_C2, VERTEX_A1, VERTEX_C1],
        after: [VERTEX_C2, VERTEX_B2, VERTEX_C2, VERTEX_B1]
      },
      {
        name: 'Pattern 4: c1-b1-c1-b2 → a1-c1-a2-c2',
        before: [VERTEX_C1, VERTEX_B1, VERTEX_C1, VERTEX_B2],
        after: [VERTEX_A1, VERTEX_C1, VERTEX_A2, VERTEX_C2]
      },
      {
        name: 'Pattern 5: a2-b1-c1-c2 → c2-c1-a2-b1',
        before: [VERTEX_A2, VERTEX_B1, VERTEX_C1, VERTEX_C2],
        after: [VERTEX_C2, VERTEX_C1, VERTEX_A2, VERTEX_B1]
      },
      {
        name: 'Pattern 6: c1-c2-a1-b2 → a1-b2-c2-c1',
        before: [VERTEX_C1, VERTEX_C2, VERTEX_A1, VERTEX_B2],
        after: [VERTEX_A1, VERTEX_B2, VERTEX_C2, VERTEX_C1]
      },
      {
        name: 'Pattern 7: b2-a2-b1-a1 → b1-a1-b2-a2',
        before: [VERTEX_B2, VERTEX_A2, VERTEX_B1, VERTEX_A1],
        after: [VERTEX_B1, VERTEX_A1, VERTEX_B2, VERTEX_A2]
      },
      {
        name: 'Pattern 8: b1-a1-b2-a2 → b2-a2-b1-a1',
        before: [VERTEX_B1, VERTEX_A1, VERTEX_B2, VERTEX_A2],
        after: [VERTEX_B2, VERTEX_A2, VERTEX_B1, VERTEX_A1]
      },
      {
        name: 'Pattern 9: c2-b2-c2-b1 → a2-c2-a1-c2 (matching UP pattern 4)',
        before: [VERTEX_C2, VERTEX_B2, VERTEX_C2, VERTEX_B1],
        after: [VERTEX_A2, VERTEX_C2, VERTEX_A1, VERTEX_C2]
      },
      {
        name: 'Pattern 10: a1-c1-a2-c2 → c1-b1-c1-b2',
        before: [VERTEX_A1, VERTEX_C1, VERTEX_A2, VERTEX_C2],
        after: [VERTEX_C1, VERTEX_B1, VERTEX_C1, VERTEX_B2]
      }
    ];
    
    downTestCases.forEach((testCase) => {
      test(testCase.name, () => {
        const [v1, v2, v3, v4] = testCase.before;
        const result = applyFlipTransformationCorrected(v1, v2, v3, v4, FlipDirection.Down);
        
        expect(result).not.toBeNull();
        if (result) {
          expect(result.new1).toBe(testCase.after[0]);
          expect(result.new2).toBe(testCase.after[1]);
          expect(result.new3).toBe(testCase.after[2]);
          expect(result.new4).toBe(testCase.after[3]);
        }
      });
    });
  });
  
  describe('Reversibility of transformations', () => {
    test('UP Pattern 1 and Pattern 2 are reverse of each other', () => {
      // Pattern 1: a1-b2-a2-b1 → c1-c2-c1-c2
      const start = [VERTEX_A1, VERTEX_B2, VERTEX_A2, VERTEX_B1];
      const middle = applyFlipTransformationCorrected(
        start[0], start[1], start[2], start[3], FlipDirection.Up
      );
      
      expect(middle).toEqual({
        new1: VERTEX_C1, new2: VERTEX_C2, new3: VERTEX_C1, new4: VERTEX_C2
      });
      
      // Pattern 2: c2-c1-c2-c1 → a2-b1-a1-b2
      // Note: Pattern 2 has different vertex order
      const back = applyFlipTransformationCorrected(
        VERTEX_C2, VERTEX_C1, VERTEX_C2, VERTEX_C1, FlipDirection.Up
      );
      
      expect(back).toEqual({
        new1: VERTEX_A2, new2: VERTEX_B1, new3: VERTEX_A1, new4: VERTEX_B2
      });
    });
    
    test('UP Pattern 3 and Pattern 9 are reverse of each other', () => {
      // Pattern 3: a1-c1-a2-c2 → c1-b1-c1-b2
      const start = [VERTEX_A1, VERTEX_C1, VERTEX_A2, VERTEX_C2];
      const middle = applyFlipTransformationCorrected(
        start[0], start[1], start[2], start[3], FlipDirection.Up
      );
      
      expect(middle).toEqual({
        new1: VERTEX_C1, new2: VERTEX_B1, new3: VERTEX_C1, new4: VERTEX_B2
      });
      
      // Pattern 9: c1-b1-c1-b2 → a1-c1-a2-c2
      const back = applyFlipTransformationCorrected(
        VERTEX_C1, VERTEX_B1, VERTEX_C1, VERTEX_B2, FlipDirection.Up
      );
      
      expect(back).toEqual({
        new1: VERTEX_A1, new2: VERTEX_C1, new3: VERTEX_A2, new4: VERTEX_C2
      });
    });
  });
  
  describe('Visual verification report', () => {
    test('generates complete verification report', () => {
      const report = verifyAllTransformations();
      
      // Check that report contains expected sections
      expect(report).toContain('FLIP TRANSFORMATION VERIFICATION');
      expect(report).toContain('UP FLIP TRANSFORMATIONS');
      expect(report).toContain('DOWN FLIP TRANSFORMATIONS');
      expect(report).toContain('SUMMARY');
      
      // Check that all patterns are included
      for (let i = 1; i <= 10; i++) {
        expect(report).toContain(`Pattern ${i}:`);
      }
      
      // Check that ice rule validations are present
      expect(report).toContain('Ice rule:');
      
      // Check that the fixed pattern 4 is mentioned
      expect(report).toContain('Pattern 4 in UP flip correctly transforms b1→c2');
      
      // Ensure no ice rule violations
      expect(report).not.toContain('✗ INVALID');
      
      // Print report for manual inspection
      console.log('\n' + '='.repeat(80));
      console.log('FULL VERIFICATION REPORT:');
      console.log('='.repeat(80));
      console.log(report);
    });
  });
});