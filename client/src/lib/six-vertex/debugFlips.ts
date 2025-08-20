/**
 * Debug script to investigate flip detection issue
 */

import { OptimizedPhysicsSimulation } from './optimizedSimulation';
import { VERTEX_A1, VERTEX_A2, VERTEX_B1, VERTEX_B2, VERTEX_C1, VERTEX_C2 } from './correctedFlipLogic';

// Create a simulation
const sim = new OptimizedPhysicsSimulation({
  size: 8,
  weights: {
    a1: 1.0,
    a2: 1.0,
    b1: 1.0,
    b2: 1.0,
    c1: 1.0,
    c2: 1.0,
  },
  seed: 42,
  initialState: 'dwbc-high',
});

// Get initial stats
const initialStats = sim.getStats();
console.log('Initial flippable count:', initialStats.flippableCount);

// Get the raw state
const state = sim.getRawState();
const size = 8;

// Manually check all positions for flippability
let flippablePositions: Array<{row: number, col: number, canFlipUp: boolean, canFlipDown: boolean}> = [];

for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    // Check up flip
    let canFlipUp = false;
    let canFlipDown = false;
    
    // For up flip: need row > 0 and col < size - 1
    if (row > 0 && col < size - 1) {
      const v1 = state[row * size + col];           // base
      const v2 = state[row * size + col + 1];       // right
      const v3 = state[(row - 1) * size + col + 1]; // upper-right
      const v4 = state[(row - 1) * size + col];     // upper
      
      // Check if this is a valid flip pattern (simplified check)
      // Look for patterns that can flip
      if ((v1 === VERTEX_A1 && v2 === VERTEX_B2 && v3 === VERTEX_A2 && v4 === VERTEX_B1) ||
          (v1 === VERTEX_C2 && v2 === VERTEX_C1 && v3 === VERTEX_C2 && v4 === VERTEX_C1) ||
          (v1 === VERTEX_A1 && v2 === VERTEX_C1 && v3 === VERTEX_A2 && v4 === VERTEX_C2) ||
          (v1 === VERTEX_C2 && v2 === VERTEX_B2 && v3 === VERTEX_C2 && v4 === VERTEX_B1) ||
          (v1 === VERTEX_A1 && v2 === VERTEX_B2 && v3 === VERTEX_C2 && v4 === VERTEX_C1) ||
          (v1 === VERTEX_C2 && v2 === VERTEX_C1 && v3 === VERTEX_A2 && v4 === VERTEX_B1) ||
          (v1 === VERTEX_B1 && v2 === VERTEX_A1 && v3 === VERTEX_B2 && v4 === VERTEX_A2) ||
          (v1 === VERTEX_B2 && v2 === VERTEX_A2 && v3 === VERTEX_B1 && v4 === VERTEX_A1) ||
          (v1 === VERTEX_C1 && v2 === VERTEX_B1 && v3 === VERTEX_C1 && v4 === VERTEX_B2) ||
          (v1 === VERTEX_A2 && v2 === VERTEX_C2 && v3 === VERTEX_A1 && v4 === VERTEX_C1)) {
        canFlipUp = true;
      }
    }
    
    // For down flip: need row < size - 1 and col > 0
    if (row < size - 1 && col > 0) {
      const v1 = state[(row + 1) * size + col - 1]; // down-left
      const v2 = state[(row + 1) * size + col];     // down
      const v3 = state[row * size + col];           // base
      const v4 = state[row * size + col - 1];       // left
      
      // Check if this is a valid flip pattern
      if ((v1 === VERTEX_A2 && v2 === VERTEX_B1 && v3 === VERTEX_A1 && v4 === VERTEX_B2) ||
          (v1 === VERTEX_C1 && v2 === VERTEX_C2 && v3 === VERTEX_C1 && v4 === VERTEX_C2) ||
          (v1 === VERTEX_A2 && v2 === VERTEX_C2 && v3 === VERTEX_A1 && v4 === VERTEX_C1) ||
          (v1 === VERTEX_C1 && v2 === VERTEX_B1 && v3 === VERTEX_C1 && v4 === VERTEX_B2) ||
          (v1 === VERTEX_A2 && v2 === VERTEX_B1 && v3 === VERTEX_C1 && v4 === VERTEX_C2) ||
          (v1 === VERTEX_C1 && v2 === VERTEX_C2 && v3 === VERTEX_A1 && v4 === VERTEX_B2) ||
          (v1 === VERTEX_B2 && v2 === VERTEX_A2 && v3 === VERTEX_B1 && v4 === VERTEX_A1) ||
          (v1 === VERTEX_B1 && v2 === VERTEX_A1 && v3 === VERTEX_B2 && v4 === VERTEX_A2) ||
          (v1 === VERTEX_C2 && v2 === VERTEX_B2 && v3 === VERTEX_C2 && v4 === VERTEX_B1) ||
          (v1 === VERTEX_A1 && v2 === VERTEX_C1 && v3 === VERTEX_A2 && v4 === VERTEX_C2)) {
        canFlipDown = true;
      }
    }
    
    if (canFlipUp || canFlipDown) {
      flippablePositions.push({ row, col, canFlipUp, canFlipDown });
    }
  }
}

console.log('\nManually found flippable positions:');
console.log('Total:', flippablePositions.length);

// Group by diagonal
const byDiagonal = new Map<number, typeof flippablePositions>();
for (const pos of flippablePositions) {
  const diag = pos.row + pos.col;
  if (!byDiagonal.has(diag)) {
    byDiagonal.set(diag, []);
  }
  byDiagonal.get(diag)!.push(pos);
}

console.log('\nFlippable positions by diagonal (row + col):');
for (const [diag, positions] of Array.from(byDiagonal).sort((a, b) => a[0] - b[0])) {
  console.log(`  Diagonal ${diag}: ${positions.length} positions`);
  for (const pos of positions) {
    console.log(`    (${pos.row}, ${pos.col}) - Up: ${pos.canFlipUp}, Down: ${pos.canFlipDown}`);
  }
}

// Check the anti-diagonal specifically (where c2 vertices are)
console.log('\nAnti-diagonal analysis (row + col = 7):');
for (let row = 0; row < size; row++) {
  const col = 7 - row;
  if (col >= 0 && col < size) {
    const idx = row * size + col;
    const vertexType = state[idx];
    const vertexName = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'][vertexType];
    console.log(`  (${row}, ${col}): ${vertexName}`);
  }
}

// Print the full lattice
console.log('\nFull lattice:');
for (let row = 0; row < size; row++) {
  let line = '';
  for (let col = 0; col < size; col++) {
    const idx = row * size + col;
    const vertexType = state[idx];
    const vertexName = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'][vertexType];
    line += vertexName + ' ';
  }
  console.log(line);
}

// Run a few steps and see what happens
console.log('\n=== Running 100 steps ===');
for (let i = 0; i < 100; i++) {
  sim.step();
}

const afterStats = sim.getStats();
console.log('After 100 steps:');
console.log('  Flippable count:', afterStats.flippableCount);
console.log('  Successful flips:', afterStats.successfulFlips);
console.log('  Acceptance rate:', afterStats.acceptanceRate.toFixed(3));

// Check the new state
const newState = sim.getRawState();
let changedPositions = [];
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    const idx = row * size + col;
    if (state[idx] !== newState[idx]) {
      changedPositions.push({ row, col, 
        old: ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'][state[idx]],
        new: ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'][newState[idx]]
      });
    }
  }
}

console.log('\nChanged positions:', changedPositions.length);
if (changedPositions.length > 0) {
  // Group by diagonal
  const changedByDiagonal = new Map<number, typeof changedPositions>();
  for (const pos of changedPositions) {
    const diag = pos.row + pos.col;
    if (!changedByDiagonal.has(diag)) {
      changedByDiagonal.set(diag, []);
    }
    changedByDiagonal.get(diag)!.push(pos);
  }
  
  console.log('\nChanged positions by diagonal:');
  for (const [diag, positions] of Array.from(changedByDiagonal).sort((a, b) => a[0] - b[0])) {
    console.log(`  Diagonal ${diag}: ${positions.length} positions`);
  }
}

export {};