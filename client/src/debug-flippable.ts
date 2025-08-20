/**
 * Debug script to understand why positions aren't flippable
 */

import { OptimizedPhysicsSimulation } from './lib/six-vertex/optimizedSimulation';
import { FlipDirection } from './lib/six-vertex/physicsFlips';
import { 
  VERTEX_A1, VERTEX_A2, VERTEX_B1, VERTEX_B2, VERTEX_C1, VERTEX_C2,
  isFlipValidCorrected,
  applyFlipTransformationCorrected
} from './lib/six-vertex/correctedFlipLogic';

function debugFlippability() {
  console.log('Debugging flippability...\n');

  // Create simulation and run a few steps
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

  // Run a few steps to get c2 vertices off diagonal
  sim.run(50);
  
  const rawState = sim.getRawState();
  const size = 8;
  
  // Map vertex types
  const typeMap: Record<number, string> = {
    [VERTEX_A1]: 'a1',
    [VERTEX_A2]: 'a2',
    [VERTEX_B1]: 'b1',
    [VERTEX_B2]: 'b2',
    [VERTEX_C1]: 'c1',
    [VERTEX_C2]: 'c2',
  };

  console.log('Current state:');
  for (let row = 0; row < size; row++) {
    let line = '';
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      line += typeMap[rawState[idx]] + ' ';
    }
    console.log(line);
  }

  console.log('\nChecking all positions for flippability:');
  let totalFlippable = 0;
  const flippablePositions: Array<{row: number, col: number, up: boolean, down: boolean}> = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const canFlipUp = isFlipValidCorrected(rawState, size, row, col, FlipDirection.Up);
      const canFlipDown = isFlipValidCorrected(rawState, size, row, col, FlipDirection.Down);
      
      if (canFlipUp || canFlipDown) {
        totalFlippable++;
        flippablePositions.push({ row, col, up: canFlipUp, down: canFlipDown });
      }
    }
  }

  console.log(`Total flippable positions: ${totalFlippable}\n`);

  // Detail each flippable position
  console.log('Flippable positions details:');
  for (const pos of flippablePositions) {
    const idx = pos.row * size + pos.col;
    const vertexType = typeMap[rawState[idx]];
    const dirs = [];
    if (pos.up) dirs.push('UP');
    if (pos.down) dirs.push('DOWN');
    console.log(`  (${pos.row}, ${pos.col}) - ${vertexType} - can flip: ${dirs.join(', ')}`);
  }

  // Now let's check why c2 vertices aren't flippable
  console.log('\nAnalyzing c2 vertices:');
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      if (rawState[idx] === VERTEX_C2) {
        console.log(`\nc2 at (${row}, ${col}):`);
        
        // Check UP flip
        if (row > 0 && col < size - 1) {
          const v1 = rawState[row * size + col];           // base (c2)
          const v2 = rawState[row * size + col + 1];       // right
          const v3 = rawState[(row - 1) * size + col + 1]; // upper-right
          const v4 = rawState[(row - 1) * size + col];     // upper
          
          console.log(`  UP plaquette: ${typeMap[v1]}-${typeMap[v2]}-${typeMap[v3]}-${typeMap[v4]}`);
          const upTransform = applyFlipTransformationCorrected(v1, v2, v3, v4, FlipDirection.Up);
          if (upTransform) {
            console.log(`    ✓ Can flip UP to: ${typeMap[upTransform.new1]}-${typeMap[upTransform.new2]}-${typeMap[upTransform.new3]}-${typeMap[upTransform.new4]}`);
          } else {
            console.log(`    ✗ No valid UP flip`);
          }
        }
        
        // Check DOWN flip
        if (row < size - 1 && col > 0) {
          const v1 = rawState[(row + 1) * size + col - 1]; // down-left
          const v2 = rawState[(row + 1) * size + col];     // down
          const v3 = rawState[row * size + col];           // base (c2)
          const v4 = rawState[row * size + col - 1];       // left
          
          console.log(`  DOWN plaquette: ${typeMap[v1]}-${typeMap[v2]}-${typeMap[v3]}-${typeMap[v4]}`);
          const downTransform = applyFlipTransformationCorrected(v1, v2, v3, v4, FlipDirection.Down);
          if (downTransform) {
            console.log(`    ✓ Can flip DOWN to: ${typeMap[downTransform.new1]}-${typeMap[downTransform.new2]}-${typeMap[downTransform.new3]}-${typeMap[downTransform.new4]}`);
          } else {
            console.log(`    ✗ No valid DOWN flip`);
          }
        }
      }
    }
  }

  // Let's also check b1 and b2 vertices to see if they can flip
  console.log('\nSampling b1 vertices:');
  let b1Count = 0;
  for (let row = 0; row < size && b1Count < 3; row++) {
    for (let col = 0; col < size && b1Count < 3; col++) {
      const idx = row * size + col;
      if (rawState[idx] === VERTEX_B1) {
        b1Count++;
        console.log(`\nb1 at (${row}, ${col}):`);
        
        // Check UP flip
        if (row > 0 && col < size - 1) {
          const v1 = rawState[row * size + col];
          const v2 = rawState[row * size + col + 1];
          const v3 = rawState[(row - 1) * size + col + 1];
          const v4 = rawState[(row - 1) * size + col];
          
          console.log(`  UP plaquette: ${typeMap[v1]}-${typeMap[v2]}-${typeMap[v3]}-${typeMap[v4]}`);
          const upTransform = applyFlipTransformationCorrected(v1, v2, v3, v4, FlipDirection.Up);
          console.log(`    ${upTransform ? '✓ Can flip UP' : '✗ No valid UP flip'}`);
        }
        
        // Check DOWN flip
        if (row < size - 1 && col > 0) {
          const v1 = rawState[(row + 1) * size + col - 1];
          const v2 = rawState[(row + 1) * size + col];
          const v3 = rawState[row * size + col];
          const v4 = rawState[row * size + col - 1];
          
          console.log(`  DOWN plaquette: ${typeMap[v1]}-${typeMap[v2]}-${typeMap[v3]}-${typeMap[v4]}`);
          const downTransform = applyFlipTransformationCorrected(v1, v2, v3, v4, FlipDirection.Down);
          console.log(`    ${downTransform ? '✓ Can flip DOWN' : '✗ No valid DOWN flip'}`);
        }
      }
    }
  }
}

// Run the debug
debugFlippability();