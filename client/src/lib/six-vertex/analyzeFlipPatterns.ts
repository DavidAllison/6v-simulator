/**
 * Analyze what flip patterns are possible after initial flips
 */

import { OptimizedPhysicsSimulation } from './optimizedSimulation';
import { VERTEX_A1, VERTEX_A2, VERTEX_B1, VERTEX_B2, VERTEX_C1, VERTEX_C2 } from './correctedFlipLogic';

const vertexNames = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

function analyzeFlipPossibilities(size: number = 8) {
  console.log(`\n=== Analyzing Flip Possibilities for ${size}x${size} lattice ===\n`);

  const sim = new OptimizedPhysicsSimulation({
    size,
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

  // Show initial configuration
  console.log('Initial DWBC-High configuration:');
  const initialState = sim.getRawState();
  for (let row = 0; row < size; row++) {
    let line = '';
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      line += vertexNames[initialState[idx]] + ' ';
    }
    console.log(line);
  }

  // Run one flip and see what happens
  console.log('\n=== After 1 successful flip ===');
  let flipped = false;
  let attempts = 0;
  while (!flipped && attempts < 1000) {
    const statsBefore = sim.getStats();
    sim.step();
    const statsAfter = sim.getStats();
    if (statsAfter.successfulFlips > statsBefore.successfulFlips) {
      flipped = true;
      console.log(`Flip succeeded after ${attempts + 1} attempts`);
    }
    attempts++;
  }

  if (flipped) {
    const state1 = sim.getRawState();
    
    // Find what changed
    let changedPositions = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const idx = row * size + col;
        if (initialState[idx] !== state1[idx]) {
          changedPositions.push({
            row, col,
            before: vertexNames[initialState[idx]],
            after: vertexNames[state1[idx]]
          });
        }
      }
    }
    
    console.log('\nChanged vertices:');
    for (const pos of changedPositions) {
      console.log(`  (${pos.row}, ${pos.col}): ${pos.before} → ${pos.after}`);
    }
    
    // Show the new configuration
    console.log('\nNew configuration:');
    for (let row = 0; row < size; row++) {
      let line = '';
      for (let col = 0; col < size; col++) {
        const idx = row * size + col;
        if (initialState[idx] !== state1[idx]) {
          line += `[${vertexNames[state1[idx]]}]`;
        } else {
          line += ` ${vertexNames[state1[idx]]} `;
        }
      }
      console.log(line);
    }
    
    // Now check what's flippable
    console.log('\n=== Analyzing new flippable positions ===');
    const stats = sim.getStats();
    console.log(`Flippable count: ${stats.flippableCount}`);
    
    // Manually check all positions for potential flips
    let potentialFlips = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        // Check up flip possibility
        if (row > 0 && col < size - 1) {
          const v1 = state1[row * size + col];
          const v2 = state1[row * size + col + 1];
          const v3 = state1[(row - 1) * size + col + 1];
          const v4 = state1[(row - 1) * size + col];
          
          // Check if this forms a flippable pattern
          const pattern = `${vertexNames[v1]}-${vertexNames[v2]}-${vertexNames[v3]}-${vertexNames[v4]}`;
          
          // Known flippable patterns from correctedFlipLogic.ts
          const upFlippablePatterns = [
            'a1-b2-a2-b1', 'c2-c1-c2-c1', 'a1-c1-a2-c2', 'c2-b2-c2-b1',
            'a1-b2-c2-c1', 'c2-c1-a2-b1', 'b1-a1-b2-a2', 'b2-a2-b1-a1',
            'c1-b1-c1-b2', 'a2-c2-a1-c1'
          ];
          
          if (upFlippablePatterns.includes(pattern)) {
            potentialFlips.push({ row, col, direction: 'up', pattern });
          }
        }
        
        // Check down flip possibility
        if (row < size - 1 && col > 0) {
          const v1 = state1[(row + 1) * size + col - 1];
          const v2 = state1[(row + 1) * size + col];
          const v3 = state1[row * size + col];
          const v4 = state1[row * size + col - 1];
          
          const pattern = `${vertexNames[v1]}-${vertexNames[v2]}-${vertexNames[v3]}-${vertexNames[v4]}`;
          
          const downFlippablePatterns = [
            'a2-b1-a1-b2', 'c1-c2-c1-c2', 'a2-c2-a1-c1', 'c1-b1-c1-b2',
            'a2-b1-c1-c2', 'c1-c2-a1-b2', 'b2-a2-b1-a1', 'b1-a1-b2-a2',
            'c2-b2-c2-b1', 'a1-c1-a2-c2'
          ];
          
          if (downFlippablePatterns.includes(pattern)) {
            potentialFlips.push({ row, col, direction: 'down', pattern });
          }
        }
      }
    }
    
    console.log(`\nFound ${potentialFlips.length} flippable positions:`);
    
    // Group by diagonal
    const byDiagonal = new Map();
    for (const flip of potentialFlips) {
      const diag = flip.row + flip.col;
      if (!byDiagonal.has(diag)) {
        byDiagonal.set(diag, []);
      }
      byDiagonal.get(diag).push(flip);
    }
    
    for (const [diag, flips] of Array.from(byDiagonal).sort((a, b) => a[0] - b[0])) {
      console.log(`  Diagonal ${diag}: ${flips.length} positions`);
      for (const flip of flips.slice(0, 3)) { // Show first 3
        console.log(`    (${flip.row}, ${flip.col}) ${flip.direction}: ${flip.pattern}`);
      }
      if (flips.length > 3) {
        console.log(`    ... and ${flips.length - 3} more`);
      }
    }
  }
  
  // Run more steps and see evolution
  console.log('\n=== Running 1000 more steps ===');
  for (let i = 0; i < 1000; i++) {
    sim.step();
  }
  
  const finalStats = sim.getStats();
  const finalState = sim.getRawState();
  
  // Count final changes
  let totalChanges = 0;
  const changesByDiagonal = new Map();
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      if (initialState[idx] !== finalState[idx]) {
        totalChanges++;
        const diag = row + col;
        changesByDiagonal.set(diag, (changesByDiagonal.get(diag) || 0) + 1);
      }
    }
  }
  
  console.log(`\nFinal statistics:`);
  console.log(`  Total changes from initial: ${totalChanges}`);
  console.log(`  Successful flips: ${finalStats.successfulFlips}`);
  console.log(`  Acceptance rate: ${finalStats.acceptanceRate.toFixed(3)}`);
  console.log(`  Final flippable count: ${finalStats.flippableCount}`);
  
  console.log(`\nChanges by diagonal:`);
  for (const [diag, count] of Array.from(changesByDiagonal).sort((a, b) => a[0] - b[0])) {
    console.log(`  Diagonal ${diag}: ${count} changes`);
  }
}

// Run the analysis
analyzeFlipPossibilities(8);

export {};