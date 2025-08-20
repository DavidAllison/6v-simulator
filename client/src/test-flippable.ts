/**
 * Test to verify that vertices off the diagonal can flip
 */

import { OptimizedPhysicsSimulation } from './lib/six-vertex/optimizedSimulation';
import { FlipDirection } from './lib/six-vertex/physicsFlips';
import { VERTEX_A1, VERTEX_A2, VERTEX_B1, VERTEX_B2, VERTEX_C1, VERTEX_C2 } from './lib/six-vertex/correctedFlipLogic';

function testFlippablePositions() {
  console.log('Testing flippable positions in 6-vertex model...\n');

  // Create a small simulation for testing
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
  let stats = sim.getStats();
  console.log('Initial state:');
  console.log(`  c2 vertices: ${stats.vertexCounts.c2}`);
  console.log(`  Flippable positions: ${stats.flippableCount}`);
  console.log(`  Height: ${stats.height}\n`);

  // Run for a few steps to move c2 vertices off diagonal
  console.log('Running 100 steps...');
  sim.run(100);
  
  stats = sim.getStats();
  console.log(`After 100 steps:`);
  console.log(`  c2 vertices: ${stats.vertexCounts.c2}`);
  console.log(`  Flippable positions: ${stats.flippableCount}`);
  console.log(`  Successful flips: ${stats.successfulFlips}`);
  console.log(`  Acceptance rate: ${(stats.acceptanceRate * 100).toFixed(1)}%\n`);

  // Run more steps
  console.log('Running 1000 more steps...');
  sim.run(1000);
  
  stats = sim.getStats();
  console.log(`After 1100 steps total:`);
  console.log(`  c2 vertices: ${stats.vertexCounts.c2}`);
  console.log(`  Flippable positions: ${stats.flippableCount}`);
  console.log(`  Successful flips: ${stats.successfulFlips}`);
  console.log(`  Acceptance rate: ${(stats.acceptanceRate * 100).toFixed(1)}%\n`);

  // Check the raw state to see where c2 vertices are
  const rawState = sim.getRawState();
  const size = 8;
  console.log('\nLocations of c2 vertices:');
  let c2Count = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      if (rawState[idx] === VERTEX_C2) {
        const onAntiDiag = (row + col === size - 1);
        console.log(`  (${row}, ${col}) - ${onAntiDiag ? 'ON anti-diagonal' : 'OFF diagonal'}`);
        c2Count++;
      }
    }
  }
  console.log(`Total c2 vertices: ${c2Count}`);

  // Visual representation
  console.log('\n2D visualization (c=c2, .=other):');
  for (let row = 0; row < size; row++) {
    let line = '';
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      line += rawState[idx] === VERTEX_C2 ? 'c ' : '. ';
    }
    console.log(line);
  }

  // Run many more steps to see if Arctic regions form
  console.log('\nRunning 10000 more steps to check for Arctic region formation...');
  sim.run(10000);
  
  stats = sim.getStats();
  console.log(`After 11100 steps total:`);
  console.log(`  a1 vertices: ${stats.vertexCounts.a1}`);
  console.log(`  a2 vertices: ${stats.vertexCounts.a2}`);
  console.log(`  b1 vertices: ${stats.vertexCounts.b1}`);
  console.log(`  b2 vertices: ${stats.vertexCounts.b2}`);
  console.log(`  c1 vertices: ${stats.vertexCounts.c1}`);
  console.log(`  c2 vertices: ${stats.vertexCounts.c2}`);
  console.log(`  Flippable positions: ${stats.flippableCount}`);
  console.log(`  Acceptance rate: ${(stats.acceptanceRate * 100).toFixed(1)}%`);

  // Final visualization
  console.log('\nFinal state visualization:');
  const finalState = sim.getRawState();
  const typeMap: Record<number, string> = {
    [VERTEX_A1]: 'a1',
    [VERTEX_A2]: 'a2',
    [VERTEX_B1]: 'b1',
    [VERTEX_B2]: 'b2',
    [VERTEX_C1]: 'c1',
    [VERTEX_C2]: 'c2',
  };
  
  for (let row = 0; row < size; row++) {
    let line = '';
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      line += typeMap[finalState[idx]] + ' ';
    }
    console.log(line);
  }

  // Check for Arctic regions (frozen areas of all a1 or all a2)
  console.log('\nChecking for Arctic regions...');
  
  // Check upper-left corner for a1 dominance
  let a1InUpperLeft = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * size + col;
      if (finalState[idx] === VERTEX_A1) a1InUpperLeft++;
    }
  }
  console.log(`  Upper-left (3x3): ${a1InUpperLeft}/9 are a1 vertices`);

  // Check lower-right corner for a2 dominance
  let a2InLowerRight = 0;
  for (let row = size - 3; row < size; row++) {
    for (let col = size - 3; col < size; col++) {
      const idx = row * size + col;
      if (finalState[idx] === VERTEX_A2) a2InLowerRight++;
    }
  }
  console.log(`  Lower-right (3x3): ${a2InLowerRight}/9 are a2 vertices`);

  if (a1InUpperLeft >= 7 || a2InLowerRight >= 7) {
    console.log('\n✓ Arctic regions are forming!');
  } else {
    console.log('\n✗ Arctic regions are NOT forming properly');
    console.log('  This suggests c2 vertices may not be moving off the diagonal correctly');
  }
}

// Run the test
testFlippablePositions();