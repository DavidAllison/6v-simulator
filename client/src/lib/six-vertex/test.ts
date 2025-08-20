/**
 * Test file to validate the physics implementation
 * Checks that DWBC High and Low states match the paper's figures
 */

import { generateDWBCHigh, generateDWBCLow } from './initialStates';
import { VertexType } from './types';
import { PhysicsSimulation } from './physicsSimulation';

/**
 * Print a lattice state in the same format as the paper
 */
function printLattice(state: any, title: string): void {
  console.log(`\n${title}:`);
  console.log('='.repeat(state.width * 3));

  for (let row = 0; row < state.height; row++) {
    let line = '';
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];
      // Use same notation as paper: a1, a2, b1, b2, c1, c2
      line += vertex.type.padEnd(3);
    }
    console.log(line);
  }
  console.log('='.repeat(state.width * 3));
}

/**
 * Validate DWBC High matches Figure 2 pattern
 */
function validateDWBCHigh(): boolean {
  console.log('\nValidating DWBC High (Figure 2)...');

  const size = 6;
  const state = generateDWBCHigh(size);

  // Expected pattern from Figure 2:
  // b1 vertices in upper-left triangle
  // c2 vertices on anti-diagonal
  // b2 vertices in lower-right triangle

  let valid = true;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const vertex = state.vertices[row][col];

      if (row + col === size - 1) {
        // Anti-diagonal should be c2
        if (vertex.type !== VertexType.c2) {
          console.error(`Error at (${row}, ${col}): Expected c2, got ${vertex.type}`);
          valid = false;
        }
      } else if (row + col < size - 1) {
        // Upper-left should be b1
        if (vertex.type !== VertexType.b1) {
          console.error(`Error at (${row}, ${col}): Expected b1, got ${vertex.type}`);
          valid = false;
        }
      } else {
        // Lower-right should be b2
        if (vertex.type !== VertexType.b2) {
          console.error(`Error at (${row}, ${col}): Expected b2, got ${vertex.type}`);
          valid = false;
        }
      }
    }
  }

  if (valid) {
    console.log('✓ DWBC High pattern matches Figure 2');
  }

  printLattice(state, 'DWBC High (N=6)');

  return valid;
}

/**
 * Validate DWBC Low matches Figure 3 pattern
 */
function validateDWBCLow(): boolean {
  console.log('\nValidating DWBC Low (Figure 3)...');

  const size = 6;
  const state = generateDWBCLow(size);

  // Expected pattern from Figure 3:
  // c2 vertices on main diagonal
  // a1 vertices in upper-right triangle
  // a2 vertices in lower-left triangle

  let valid = true;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const vertex = state.vertices[row][col];

      if (row === col) {
        // Main diagonal should be c2
        if (vertex.type !== VertexType.c2) {
          console.error(`Error at (${row}, ${col}): Expected c2, got ${vertex.type}`);
          valid = false;
        }
      } else if (col > row) {
        // Upper-right should be a1
        if (vertex.type !== VertexType.a1) {
          console.error(`Error at (${row}, ${col}): Expected a1, got ${vertex.type}`);
          valid = false;
        }
      } else {
        // Lower-left should be a2
        if (vertex.type !== VertexType.a2) {
          console.error(`Error at (${row}, ${col}): Expected a2, got ${vertex.type}`);
          valid = false;
        }
      }
    }
  }

  if (valid) {
    console.log('✓ DWBC Low pattern matches Figure 3');
  }

  printLattice(state, 'DWBC Low (N=6)');

  return valid;
}

/**
 * Test the simulation with a small system
 */
function testSimulation(): void {
  console.log('\nTesting Physics Simulation...');

  const config = {
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
    initialState: 'dwbc-high' as const,
  };

  const sim = new PhysicsSimulation(config);

  console.log('Initial state:');
  const initialStats = sim.getStats();
  console.log('Vertex counts:', initialStats.vertexCounts);
  console.log('Initial height:', sim.getHeight());

  // Get flippable positions
  const flippable = sim.getFlippablePositions();
  console.log(`\nFlippable positions: ${flippable.length}`);

  // Run some steps
  console.log('\nRunning 1000 Monte Carlo steps...');
  sim.run(1000);

  const finalStats = sim.getStats();
  console.log('\nFinal statistics:');
  console.log('Steps:', finalStats.step);
  console.log('Vertex counts:', finalStats.vertexCounts);
  console.log('Acceptance rate:', (finalStats.acceptanceRate * 100).toFixed(2) + '%');
  console.log('Final height:', sim.getHeight());
  console.log('Energy:', finalStats.energy.toFixed(4));
}

/**
 * Run all tests
 */
export function runTests(): void {
  console.log('Running 6-Vertex Model Physics Tests');
  console.log('=====================================');

  const highValid = validateDWBCHigh();
  const lowValid = validateDWBCLow();

  testSimulation();

  console.log('\n=====================================');
  console.log('Test Results:');
  console.log(`DWBC High: ${highValid ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`DWBC Low: ${lowValid ? '✓ PASS' : '✗ FAIL'}`);

  if (highValid && lowValid) {
    console.log('\n✓ All tests passed!');
  } else {
    console.log('\n✗ Some tests failed.');
  }
}

// Export for use in other modules
export { validateDWBCHigh, validateDWBCLow, printLattice };
