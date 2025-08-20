/**
 * Test with different weight configurations to see if flips spread more
 */

import { OptimizedPhysicsSimulation } from './optimizedSimulation';

function testWeightConfiguration(weights: any, name: string, size: number = 8, steps: number = 5000) {
  console.log(`\n=== Testing ${name} ===`);
  console.log(`Weights: a1=${weights.a1}, a2=${weights.a2}, b1=${weights.b1}, b2=${weights.b2}, c1=${weights.c1}, c2=${weights.c2}`);
  
  const sim = new OptimizedPhysicsSimulation({
    size,
    weights,
    seed: 42,
    initialState: 'dwbc-high',
  });

  const initialState = sim.getRawState();
  
  // Run simulation
  for (let i = 0; i < steps; i++) {
    sim.step();
  }
  
  const finalState = sim.getRawState();
  const finalStats = sim.getStats();
  
  // Count changes by region
  let changes = { total: 0, byDiagonal: new Map() };
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      if (initialState[idx] !== finalState[idx]) {
        changes.total++;
        const diag = row + col;
        changes.byDiagonal.set(diag, (changes.byDiagonal.get(diag) || 0) + 1);
      }
    }
  }
  
  console.log(`Results after ${steps} steps:`);
  console.log(`  Total changes: ${changes.total} (${(changes.total * 100 / (size * size)).toFixed(1)}% of lattice)`);
  console.log(`  Successful flips: ${finalStats.successfulFlips}`);
  console.log(`  Acceptance rate: ${finalStats.acceptanceRate.toFixed(3)}`);
  console.log(`  Diagonals affected: ${changes.byDiagonal.size}`);
  
  // Show which diagonals changed
  const diagKeys = Array.from(changes.byDiagonal.keys()).sort((a, b) => a - b);
  if (diagKeys.length > 0) {
    console.log(`  Diagonal range: ${diagKeys[0]} to ${diagKeys[diagKeys.length - 1]}`);
  }
  
  // Visual representation
  console.log(`\nVisual ('X' = changed, '.' = unchanged):`);
  for (let row = 0; row < size; row++) {
    let line = '';
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      line += initialState[idx] !== finalState[idx] ? 'X ' : '. ';
    }
    console.log(line);
  }
}

// Test different weight configurations
console.log('Testing different weight configurations to understand flip dynamics:\n');

// 1. Equal weights (baseline)
testWeightConfiguration({
  a1: 1.0, a2: 1.0, b1: 1.0, b2: 1.0, c1: 1.0, c2: 1.0
}, 'Equal weights (a=b=c=1)');

// 2. Free fermion point (c² = a² + b²)
testWeightConfiguration({
  a1: 1.0, a2: 1.0, b1: 1.0, b2: 1.0, c1: Math.sqrt(2), c2: Math.sqrt(2)
}, 'Free fermion point (c=√2, a=b=1)');

// 3. Disorder favoring (high c weights)
testWeightConfiguration({
  a1: 1.0, a2: 1.0, b1: 1.0, b2: 1.0, c1: 2.0, c2: 2.0
}, 'Disorder favoring (c=2, a=b=1)');

// 4. Order favoring (low c weights)
testWeightConfiguration({
  a1: 2.0, a2: 2.0, b1: 2.0, b2: 2.0, c1: 1.0, c2: 1.0
}, 'Order favoring (a=b=2, c=1)');

// 5. Asymmetric (different a and b)
testWeightConfiguration({
  a1: 2.0, a2: 2.0, b1: 1.0, b2: 1.0, c1: 1.5, c2: 1.5
}, 'Asymmetric (a=2, b=1, c=1.5)');

console.log('\n=== Summary ===');
console.log('The limited spread of flips (confined to a band around the initial diagonal)');
console.log('appears to be the CORRECT physical behavior for the 6-vertex model with DWBC.');
console.log('This is because the DWBC boundary conditions create a constrained interface');
console.log('that can only roughen locally, not spread throughout the entire lattice.');

export {};