/**
 * Simple verification that flip transformations preserve the ice rule
 * This focuses on verifying that the transformations are mathematically valid
 */

import { 
  applyFlipTransformationCorrected,
  VERTEX_A1, VERTEX_A2, VERTEX_B1, VERTEX_B2, VERTEX_C1, VERTEX_C2
} from './correctedFlipLogic';
import { FlipDirection } from './physicsFlips';

// Arrow configurations for each vertex type
// Each vertex must have exactly 2 arrows IN and 2 arrows OUT
const VERTEX_ARROWS = [
  // a1: left IN, top IN, right OUT, bottom OUT
  { name: 'a1', left: 'in', top: 'in', right: 'out', bottom: 'out' },
  // a2: right IN, bottom IN, left OUT, top OUT  
  { name: 'a2', left: 'out', top: 'out', right: 'in', bottom: 'in' },
  // b1: left IN, right IN, top OUT, bottom OUT (horizontal flow through)
  { name: 'b1', left: 'in', top: 'out', right: 'in', bottom: 'out' },
  // b2: top IN, bottom IN, left OUT, right OUT (vertical flow through)
  { name: 'b2', left: 'out', top: 'in', right: 'out', bottom: 'in' },
  // c1: left IN, bottom IN, top OUT, right OUT
  { name: 'c1', left: 'in', top: 'out', right: 'out', bottom: 'in' },
  // c2: top IN, right IN, bottom OUT, left OUT
  { name: 'c2', left: 'out', top: 'in', right: 'in', bottom: 'out' }
];

function getArrows(vertex: number) {
  return VERTEX_ARROWS[vertex];
}

/**
 * Check if edges between two vertices are compatible
 * For an edge to be valid, one vertex must have arrow OUT and other must have arrow IN
 */
function checkEdgeCompatibility(v1: number, v1Edge: 'left'|'right'|'top'|'bottom', 
                                v2: number, v2Edge: 'left'|'right'|'top'|'bottom'): boolean {
  const arrows1 = getArrows(v1);
  const arrows2 = getArrows(v2);
  
  const arrow1 = arrows1[v1Edge];
  const arrow2 = arrows2[v2Edge];
  
  // One must be 'in' and other must be 'out'
  return (arrow1 === 'in' && arrow2 === 'out') || (arrow1 === 'out' && arrow2 === 'in');
}

/**
 * Verify a 2x2 plaquette satisfies the ice rule
 * Layout:
 * v4 -- v3
 * |     |
 * v1 -- v2
 */
function verifyPlaquetteIceRule(v1: number, v2: number, v3: number, v4: number): boolean {
  // Check horizontal edge v1-v2
  if (!checkEdgeCompatibility(v1, 'right', v2, 'left')) {
    console.log(`Edge v1(${VERTEX_ARROWS[v1].name})-v2(${VERTEX_ARROWS[v2].name}) incompatible`);
    return false;
  }
  
  // Check horizontal edge v4-v3
  if (!checkEdgeCompatibility(v4, 'right', v3, 'left')) {
    console.log(`Edge v4(${VERTEX_ARROWS[v4].name})-v3(${VERTEX_ARROWS[v3].name}) incompatible`);
    return false;
  }
  
  // Check vertical edge v1-v4
  if (!checkEdgeCompatibility(v1, 'top', v4, 'bottom')) {
    console.log(`Edge v1(${VERTEX_ARROWS[v1].name})-v4(${VERTEX_ARROWS[v4].name}) incompatible`);
    return false;
  }
  
  // Check vertical edge v2-v3
  if (!checkEdgeCompatibility(v2, 'top', v3, 'bottom')) {
    console.log(`Edge v2(${VERTEX_ARROWS[v2].name})-v3(${VERTEX_ARROWS[v3].name}) incompatible`);
    return false;
  }
  
  return true;
}

/**
 * Test all UP flip transformations
 */
export function testUpFlips(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0;
  let failed = 0;
  
  const patterns = [
    { before: [VERTEX_A1, VERTEX_B2, VERTEX_A2, VERTEX_B1], after: [VERTEX_C1, VERTEX_C2, VERTEX_C1, VERTEX_C2], name: 'Pattern 1' },
    { before: [VERTEX_C2, VERTEX_C1, VERTEX_C2, VERTEX_C1], after: [VERTEX_A2, VERTEX_B1, VERTEX_A1, VERTEX_B2], name: 'Pattern 2' },
    { before: [VERTEX_A1, VERTEX_C1, VERTEX_A2, VERTEX_C2], after: [VERTEX_C1, VERTEX_B1, VERTEX_C1, VERTEX_B2], name: 'Pattern 3' },
    { before: [VERTEX_C2, VERTEX_B2, VERTEX_C2, VERTEX_B1], after: [VERTEX_A2, VERTEX_C2, VERTEX_A1, VERTEX_C2], name: 'Pattern 4' },
    { before: [VERTEX_A1, VERTEX_B2, VERTEX_C2, VERTEX_C1], after: [VERTEX_C1, VERTEX_C2, VERTEX_A1, VERTEX_B2], name: 'Pattern 5' },
    { before: [VERTEX_C2, VERTEX_C1, VERTEX_A2, VERTEX_B1], after: [VERTEX_A2, VERTEX_B1, VERTEX_C1, VERTEX_C2], name: 'Pattern 6' },
    { before: [VERTEX_B1, VERTEX_A1, VERTEX_B2, VERTEX_A2], after: [VERTEX_B2, VERTEX_A2, VERTEX_B1, VERTEX_A1], name: 'Pattern 7' },
    { before: [VERTEX_B2, VERTEX_A2, VERTEX_B1, VERTEX_A1], after: [VERTEX_B1, VERTEX_A1, VERTEX_B2, VERTEX_A2], name: 'Pattern 8' },
    { before: [VERTEX_C1, VERTEX_B1, VERTEX_C1, VERTEX_B2], after: [VERTEX_A1, VERTEX_C1, VERTEX_A2, VERTEX_C2], name: 'Pattern 9' },
    { before: [VERTEX_A2, VERTEX_C2, VERTEX_A1, VERTEX_C1], after: [VERTEX_C2, VERTEX_B2, VERTEX_C2, VERTEX_B1], name: 'Pattern 10' }
  ];
  
  for (const pattern of patterns) {
    const [v1, v2, v3, v4] = pattern.before;
    const beforeValid = verifyPlaquetteIceRule(v1, v2, v3, v4);
    
    const result = applyFlipTransformationCorrected(v1, v2, v3, v4, FlipDirection.Up);
    
    if (!result) {
      details.push(`${pattern.name}: Transformation returned null`);
      failed++;
      continue;
    }
    
    const afterValid = verifyPlaquetteIceRule(result.new1, result.new2, result.new3, result.new4);
    
    const transformCorrect = 
      result.new1 === pattern.after[0] &&
      result.new2 === pattern.after[1] &&
      result.new3 === pattern.after[2] &&
      result.new4 === pattern.after[3];
    
    if (beforeValid && afterValid && transformCorrect) {
      details.push(`${pattern.name}: ✓ PASS (ice rule preserved)`);
      passed++;
    } else {
      details.push(`${pattern.name}: ✗ FAIL`);
      if (!beforeValid) details.push(`  - Before state violates ice rule`);
      if (!afterValid) details.push(`  - After state violates ice rule`);
      if (!transformCorrect) {
        details.push(`  - Transform incorrect:`);
        details.push(`    Expected: [${pattern.after.map(v => VERTEX_ARROWS[v].name).join(', ')}]`);
        details.push(`    Got: [${[result.new1, result.new2, result.new3, result.new4].map(v => VERTEX_ARROWS[v].name).join(', ')}]`);
      }
      failed++;
    }
  }
  
  return { passed, failed, details };
}

/**
 * Test all DOWN flip transformations
 */
export function testDownFlips(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0;
  let failed = 0;
  
  const patterns = [
    { before: [VERTEX_A2, VERTEX_B1, VERTEX_A1, VERTEX_B2], after: [VERTEX_C2, VERTEX_C1, VERTEX_C2, VERTEX_C1], name: 'Pattern 1' },
    { before: [VERTEX_C1, VERTEX_C2, VERTEX_C1, VERTEX_C2], after: [VERTEX_A1, VERTEX_B2, VERTEX_A2, VERTEX_B1], name: 'Pattern 2' },
    { before: [VERTEX_A2, VERTEX_C2, VERTEX_A1, VERTEX_C1], after: [VERTEX_C2, VERTEX_B2, VERTEX_C2, VERTEX_B1], name: 'Pattern 3' },
    { before: [VERTEX_C1, VERTEX_B1, VERTEX_C1, VERTEX_B2], after: [VERTEX_A1, VERTEX_C1, VERTEX_A2, VERTEX_C2], name: 'Pattern 4' },
    { before: [VERTEX_A2, VERTEX_B1, VERTEX_C1, VERTEX_C2], after: [VERTEX_C2, VERTEX_C1, VERTEX_A2, VERTEX_B1], name: 'Pattern 5' },
    { before: [VERTEX_C1, VERTEX_C2, VERTEX_A1, VERTEX_B2], after: [VERTEX_A1, VERTEX_B2, VERTEX_C2, VERTEX_C1], name: 'Pattern 6' },
    { before: [VERTEX_B2, VERTEX_A2, VERTEX_B1, VERTEX_A1], after: [VERTEX_B1, VERTEX_A1, VERTEX_B2, VERTEX_A2], name: 'Pattern 7' },
    { before: [VERTEX_B1, VERTEX_A1, VERTEX_B2, VERTEX_A2], after: [VERTEX_B2, VERTEX_A2, VERTEX_B1, VERTEX_A1], name: 'Pattern 8' },
    { before: [VERTEX_C2, VERTEX_B2, VERTEX_C2, VERTEX_B1], after: [VERTEX_A2, VERTEX_C2, VERTEX_A1, VERTEX_C2], name: 'Pattern 9' },
    { before: [VERTEX_A1, VERTEX_C1, VERTEX_A2, VERTEX_C2], after: [VERTEX_C1, VERTEX_B1, VERTEX_C1, VERTEX_B2], name: 'Pattern 10' }
  ];
  
  for (const pattern of patterns) {
    const [v1, v2, v3, v4] = pattern.before;
    const beforeValid = verifyPlaquetteIceRule(v1, v2, v3, v4);
    
    const result = applyFlipTransformationCorrected(v1, v2, v3, v4, FlipDirection.Down);
    
    if (!result) {
      details.push(`${pattern.name}: Transformation returned null`);
      failed++;
      continue;
    }
    
    const afterValid = verifyPlaquetteIceRule(result.new1, result.new2, result.new3, result.new4);
    
    const transformCorrect = 
      result.new1 === pattern.after[0] &&
      result.new2 === pattern.after[1] &&
      result.new3 === pattern.after[2] &&
      result.new4 === pattern.after[3];
    
    if (beforeValid && afterValid && transformCorrect) {
      details.push(`${pattern.name}: ✓ PASS (ice rule preserved)`);
      passed++;
    } else {
      details.push(`${pattern.name}: ✗ FAIL`);
      if (!beforeValid) details.push(`  - Before state violates ice rule`);
      if (!afterValid) details.push(`  - After state violates ice rule`);
      if (!transformCorrect) {
        details.push(`  - Transform incorrect:`);
        details.push(`    Expected: [${pattern.after.map(v => VERTEX_ARROWS[v].name).join(', ')}]`);
        details.push(`    Got: [${[result.new1, result.new2, result.new3, result.new4].map(v => VERTEX_ARROWS[v].name).join(', ')}]`);
      }
      failed++;
    }
  }
  
  return { passed, failed, details };
}

/**
 * Run complete verification
 */
export function runSimpleVerification(): void {
  console.log('=' .repeat(60));
  console.log('SIMPLE FLIP TRANSFORMATION VERIFICATION');
  console.log('=' .repeat(60));
  console.log('');
  
  console.log('UP FLIPS:');
  console.log('-'.repeat(40));
  const upResults = testUpFlips();
  upResults.details.forEach(d => console.log(d));
  console.log('');
  console.log(`Summary: ${upResults.passed} passed, ${upResults.failed} failed`);
  console.log('');
  
  console.log('DOWN FLIPS:');
  console.log('-'.repeat(40));
  const downResults = testDownFlips();
  downResults.details.forEach(d => console.log(d));
  console.log('');
  console.log(`Summary: ${downResults.passed} passed, ${downResults.failed} failed`);
  console.log('');
  
  console.log('=' .repeat(60));
  console.log('OVERALL SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total transformations tested: ${upResults.passed + upResults.failed + downResults.passed + downResults.failed}`);
  console.log(`Total passed: ${upResults.passed + downResults.passed}`);
  console.log(`Total failed: ${upResults.failed + downResults.failed}`);
  
  if (upResults.failed + downResults.failed === 0) {
    console.log('✓ All transformations preserve the ice rule!');
  } else {
    console.log('⚠️ Some transformations violate the ice rule or are incorrect');
  }
}