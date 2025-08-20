/**
 * Test Arctic region formation with longer simulations
 */

import { OptimizedPhysicsSimulation } from './lib/six-vertex/optimizedSimulation';
import { VERTEX_A1, VERTEX_A2, VERTEX_B1, VERTEX_B2, VERTEX_C1, VERTEX_C2 } from './lib/six-vertex/cStyleFlipLogic';

function testArcticRegions() {
  console.log('Testing Arctic region formation with C-style flip logic...\n');

  // Create a larger simulation
  const size = 16;
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
    batchSize: 1000,
  });

  // Get initial stats
  let stats = sim.getStats();
  console.log('Initial state (16x16 lattice):');
  console.log(`  c2 vertices: ${stats.vertexCounts.c2}`);
  console.log(`  Flippable positions: ${stats.flippableCount}\n`);

  // Run for many steps
  console.log('Running 100,000 Monte Carlo steps...');
  const startTime = performance.now();
  sim.run(100000);
  const elapsed = performance.now() - startTime;
  
  stats = sim.getStats();
  console.log(`Completed in ${(elapsed / 1000).toFixed(2)} seconds`);
  console.log(`Steps per second: ${(100000 / (elapsed / 1000)).toFixed(0)}`);
  console.log(`\nAfter 100,000 steps:`);
  console.log(`  a1 vertices: ${stats.vertexCounts.a1}`);
  console.log(`  a2 vertices: ${stats.vertexCounts.a2}`);
  console.log(`  b1 vertices: ${stats.vertexCounts.b1}`);
  console.log(`  b2 vertices: ${stats.vertexCounts.b2}`);
  console.log(`  c1 vertices: ${stats.vertexCounts.c1}`);
  console.log(`  c2 vertices: ${stats.vertexCounts.c2}`);
  console.log(`  Flippable positions: ${stats.flippableCount}`);
  console.log(`  Acceptance rate: ${(stats.acceptanceRate * 100).toFixed(1)}%`);

  // Analyze Arctic regions
  const rawState = sim.getRawState();
  
  // Check for Arctic regions in corners
  console.log('\nAnalyzing Arctic regions:');
  
  // Upper-left corner (should tend toward b1)
  let cornerSize = 5;
  let upperLeftCounts = new Array(6).fill(0);
  for (let row = 0; row < cornerSize; row++) {
    for (let col = 0; col < cornerSize; col++) {
      const idx = row * size + col;
      upperLeftCounts[rawState[idx]]++;
    }
  }
  console.log(`\nUpper-left (${cornerSize}x${cornerSize}):`);
  console.log(`  a1: ${upperLeftCounts[VERTEX_A1]}, a2: ${upperLeftCounts[VERTEX_A2]}`);
  console.log(`  b1: ${upperLeftCounts[VERTEX_B1]}, b2: ${upperLeftCounts[VERTEX_B2]}`);
  console.log(`  c1: ${upperLeftCounts[VERTEX_C1]}, c2: ${upperLeftCounts[VERTEX_C2]}`);
  
  // Lower-right corner (should tend toward b2)
  let lowerRightCounts = new Array(6).fill(0);
  for (let row = size - cornerSize; row < size; row++) {
    for (let col = size - cornerSize; col < size; col++) {
      const idx = row * size + col;
      lowerRightCounts[rawState[idx]]++;
    }
  }
  console.log(`\nLower-right (${cornerSize}x${cornerSize}):`);
  console.log(`  a1: ${lowerRightCounts[VERTEX_A1]}, a2: ${lowerRightCounts[VERTEX_A2]}`);
  console.log(`  b1: ${lowerRightCounts[VERTEX_B1]}, b2: ${lowerRightCounts[VERTEX_B2]}`);
  console.log(`  c1: ${lowerRightCounts[VERTEX_C1]}, c2: ${lowerRightCounts[VERTEX_C2]}`);

  // Upper-right corner (should tend toward a1)
  let upperRightCounts = new Array(6).fill(0);
  for (let row = 0; row < cornerSize; row++) {
    for (let col = size - cornerSize; col < size; col++) {
      const idx = row * size + col;
      upperRightCounts[rawState[idx]]++;
    }
  }
  console.log(`\nUpper-right (${cornerSize}x${cornerSize}):`);
  console.log(`  a1: ${upperRightCounts[VERTEX_A1]}, a2: ${upperRightCounts[VERTEX_A2]}`);
  console.log(`  b1: ${upperRightCounts[VERTEX_B1]}, b2: ${upperRightCounts[VERTEX_B2]}`);
  console.log(`  c1: ${upperRightCounts[VERTEX_C1]}, c2: ${upperRightCounts[VERTEX_C2]}`);

  // Lower-left corner (should tend toward a2)
  let lowerLeftCounts = new Array(6).fill(0);
  for (let row = size - cornerSize; row < size; row++) {
    for (let col = 0; col < cornerSize; col++) {
      const idx = row * size + col;
      lowerLeftCounts[rawState[idx]]++;
    }
  }
  console.log(`\nLower-left (${cornerSize}x${cornerSize}):`);
  console.log(`  a1: ${lowerLeftCounts[VERTEX_A1]}, a2: ${lowerLeftCounts[VERTEX_A2]}`);
  console.log(`  b1: ${lowerLeftCounts[VERTEX_B1]}, b2: ${lowerLeftCounts[VERTEX_B2]}`);
  console.log(`  c1: ${lowerLeftCounts[VERTEX_C1]}, c2: ${lowerLeftCounts[VERTEX_C2]}`);

  // Visual representation of the lattice
  console.log('\n2D visualization (simplified):');
  const typeMap: Record<number, string> = {
    [VERTEX_A1]: 'a',
    [VERTEX_A2]: 'A',
    [VERTEX_B1]: 'b',
    [VERTEX_B2]: 'B',
    [VERTEX_C1]: 'c',
    [VERTEX_C2]: 'C',
  };
  
  for (let row = 0; row < size; row++) {
    let line = '';
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      line += typeMap[rawState[idx]] + ' ';
    }
    console.log(line);
  }

  // Check if Arctic regions formed
  console.log('\nArctic region analysis:');
  const upperRightA1Ratio = upperRightCounts[VERTEX_A1] / (cornerSize * cornerSize);
  const lowerLeftA2Ratio = lowerLeftCounts[VERTEX_A2] / (cornerSize * cornerSize);
  const upperLeftB1Ratio = upperLeftCounts[VERTEX_B1] / (cornerSize * cornerSize);
  const lowerRightB2Ratio = lowerRightCounts[VERTEX_B2] / (cornerSize * cornerSize);
  
  console.log(`  Upper-right a1 dominance: ${(upperRightA1Ratio * 100).toFixed(1)}%`);
  console.log(`  Lower-left a2 dominance: ${(lowerLeftA2Ratio * 100).toFixed(1)}%`);
  console.log(`  Upper-left b1 dominance: ${(upperLeftB1Ratio * 100).toFixed(1)}%`);
  console.log(`  Lower-right b2 dominance: ${(lowerRightB2Ratio * 100).toFixed(1)}%`);
  
  if (upperRightA1Ratio > 0.6 || lowerLeftA2Ratio > 0.6) {
    console.log('\n✓ Arctic regions ARE forming! (a1/a2 dominance in corners)');
  } else if (upperLeftB1Ratio > 0.6 || lowerRightB2Ratio > 0.6) {
    console.log('\n✓ Frozen regions ARE forming! (b1/b2 dominance in corners)');
  } else {
    console.log('\n⚠ Arctic/frozen regions are weak or not yet formed');
    console.log('  This may require more Monte Carlo steps or different parameters');
  }
}

// Run the test
testArcticRegions();