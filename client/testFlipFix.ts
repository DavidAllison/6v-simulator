/**
 * Simple test to verify flip transformations preserve ice rule
 */

import { OptimizedPhysicsSimulation, generateDWBCHighOptimized } from './src/lib/six-vertex/optimizedSimulation';
import { VertexType, getVertexConfiguration } from './src/lib/six-vertex/types';

// Map numeric vertex types to enum
const NUM_TO_VERTEX_TYPE = [
  VertexType.a1,
  VertexType.a2,
  VertexType.b1,
  VertexType.b2,
  VertexType.c1,
  VertexType.c2,
];

function checkIceRule(vertexType: VertexType): boolean {
  const config = getVertexConfiguration(vertexType);
  if (!config) return false;
  
  let ins = 0;
  let outs = 0;
  
  if (config.left === 'in') ins++; else outs++;
  if (config.right === 'in') ins++; else outs++;
  if (config.top === 'in') ins++; else outs++;
  if (config.bottom === 'in') ins++; else outs++;
  
  return ins === 2 && outs === 2;
}

function validateLattice(state: Uint8Array, size: number): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      const vertexType = NUM_TO_VERTEX_TYPE[state[idx]];
      
      if (!checkIceRule(vertexType)) {
        violations.push(`(${row},${col}): ${vertexType} (value ${state[idx]})`);
      }
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

// Test initial state
console.log('Testing DWBC High initial state for size 4:');
const initialState = generateDWBCHighOptimized(4);
console.log('Initial state:', Array.from(initialState));
console.log('As 2D grid:');
for (let row = 0; row < 4; row++) {
  const rowValues = [];
  for (let col = 0; col < 4; col++) {
    rowValues.push(initialState[row * 4 + col]);
  }
  console.log(`Row ${row}: [${rowValues.join(', ')}]`);
}

const initialValidation = validateLattice(initialState, 4);
console.log('Initial state ice rule valid:', initialValidation.valid);
if (!initialValidation.valid) {
  console.log('Violations:', initialValidation.violations);
}

// Now test with simulation
console.log('\nTesting with simulation:');
const sim = new OptimizedPhysicsSimulation({
  size: 4,
  weights: { a1: 1, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 },
  beta: 0.5,
  seed: 12345,
  initialState: 'dwbc-high',
});

const simState = sim.getRawState();
console.log('Simulation initial state:', Array.from(simState));
const simValidation = validateLattice(new Uint8Array(simState), 4);
console.log('Simulation initial state ice rule valid:', simValidation.valid);
if (!simValidation.valid) {
  console.log('Violations:', simValidation.violations);
}

// Test multiple flips
console.log('\nAttempting multiple flips:');
let flipCount = 0;
let violationFound = false;

for (let attempt = 0; attempt < 100 && !violationFound; attempt++) {
  const stateBefore = new Uint8Array(sim.getRawState());
  sim.step();
  const stateAfter = new Uint8Array(sim.getRawState());

  // Check what changed
  let flipHappened = false;
  const changes: string[] = [];
  for (let i = 0; i < stateBefore.length; i++) {
    if (stateBefore[i] !== stateAfter[i]) {
      flipHappened = true;
      const row = Math.floor(i / 4);
      const col = i % 4;
      changes.push(`(${row},${col}): ${NUM_TO_VERTEX_TYPE[stateBefore[i]]} -> ${NUM_TO_VERTEX_TYPE[stateAfter[i]]}`);
    }
  }
  
  if (flipHappened) {
    flipCount++;
    console.log(`\nFlip ${flipCount} occurred at attempt ${attempt + 1}:`);
    changes.forEach(c => console.log(`  ${c}`));
    
    const afterValidation = validateLattice(stateAfter, 4);
    console.log(`  Ice rule valid: ${afterValidation.valid}`);
    if (!afterValidation.valid) {
      console.log('  Violations:', afterValidation.violations);
      violationFound = true;
    }
  }
}

console.log(`\nTotal flips: ${flipCount} out of 100 attempts`);
if (!violationFound && flipCount > 0) {
  console.log('All flips preserved ice rule!');
}