/**
 * Test to verify that flips can occur throughout the entire lattice
 */

import { OptimizedPhysicsSimulation } from './optimizedSimulation';

function runFlipDistributionTest(size: number = 12, steps: number = 10000) {
  console.log(`\n=== Flip Distribution Test ===`);
  console.log(`Lattice size: ${size}x${size}`);
  console.log(`Running ${steps} Monte Carlo steps...\n`);

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

  // Get initial state
  const initialState = sim.getRawState();
  
  // Run simulation
  for (let i = 0; i < steps; i++) {
    sim.step();
    
    // Print progress every 1000 steps
    if ((i + 1) % 1000 === 0) {
      const stats = sim.getStats();
      console.log(`Step ${i + 1}: ${stats.successfulFlips} successful flips, acceptance rate: ${stats.acceptanceRate.toFixed(3)}`);
    }
  }

  // Get final state
  const finalState = sim.getRawState();
  const finalStats = sim.getStats();

  // Count changed positions by location
  const changedByRow = new Array(size).fill(0);
  const changedByCol = new Array(size).fill(0);
  const changedByDiagonal = new Map<number, number>();
  const changedByAntiDiagonal = new Map<number, number>();
  let totalChanged = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      if (initialState[idx] !== finalState[idx]) {
        totalChanged++;
        changedByRow[row]++;
        changedByCol[col]++;
        
        const diag = row - col + (size - 1); // Main diagonal (normalized to 0-based)
        const antiDiag = row + col; // Anti-diagonal
        
        changedByDiagonal.set(diag, (changedByDiagonal.get(diag) || 0) + 1);
        changedByAntiDiagonal.set(antiDiag, (changedByAntiDiagonal.get(antiDiag) || 0) + 1);
      }
    }
  }

  // Print results
  console.log(`\n=== Results after ${steps} steps ===`);
  console.log(`Total positions changed: ${totalChanged} out of ${size * size} (${(totalChanged * 100 / (size * size)).toFixed(1)}%)`);
  console.log(`Successful flips: ${finalStats.successfulFlips}`);
  console.log(`Acceptance rate: ${finalStats.acceptanceRate.toFixed(3)}`);
  
  console.log(`\nChanges by row:`);
  for (let row = 0; row < size; row++) {
    const bar = '█'.repeat(Math.round(changedByRow[row] * 2));
    console.log(`  Row ${row.toString().padStart(2)}: ${changedByRow[row].toString().padStart(3)} changes ${bar}`);
  }
  
  console.log(`\nChanges by column:`);
  for (let col = 0; col < size; col++) {
    const bar = '█'.repeat(Math.round(changedByCol[col] * 2));
    console.log(`  Col ${col.toString().padStart(2)}: ${changedByCol[col].toString().padStart(3)} changes ${bar}`);
  }
  
  console.log(`\nChanges by anti-diagonal (row + col):`);
  const antiDiagKeys = Array.from(changedByAntiDiagonal.keys()).sort((a, b) => a - b);
  for (const antiDiag of antiDiagKeys) {
    const count = changedByAntiDiagonal.get(antiDiag)!;
    const bar = '█'.repeat(Math.round(count * 2));
    console.log(`  Anti-diag ${antiDiag.toString().padStart(2)}: ${count.toString().padStart(3)} changes ${bar}`);
  }
  
  // Check if changes are well-distributed
  const minRowChanges = Math.min(...changedByRow);
  const maxRowChanges = Math.max(...changedByRow);
  const minColChanges = Math.min(...changedByCol);
  const maxColChanges = Math.max(...changedByCol);
  
  console.log(`\n=== Distribution Analysis ===`);
  console.log(`Row changes range: ${minRowChanges} - ${maxRowChanges}`);
  console.log(`Column changes range: ${minColChanges} - ${maxColChanges}`);
  
  // Check which anti-diagonals have changes
  const antiDiagsWithChanges = antiDiagKeys.length;
  const totalPossibleAntiDiags = 2 * size - 1;
  console.log(`Anti-diagonals with changes: ${antiDiagsWithChanges} out of ${totalPossibleAntiDiags}`);
  
  // Determine if the distribution is good
  const isWellDistributed = 
    minRowChanges > 0 && 
    minColChanges > 0 && 
    antiDiagsWithChanges > size / 2;
  
  if (isWellDistributed) {
    console.log(`\n✅ SUCCESS: Flips are well-distributed throughout the lattice!`);
    console.log(`   - All rows have changes`);
    console.log(`   - All columns have changes`);
    console.log(`   - Changes occur on multiple diagonals (not just the initial anti-diagonal)`);
  } else {
    console.log(`\n⚠️ WARNING: Flips may be restricted to certain regions:`);
    if (minRowChanges === 0) {
      console.log(`   - Some rows have no changes`);
    }
    if (minColChanges === 0) {
      console.log(`   - Some columns have no changes`);
    }
    if (antiDiagsWithChanges <= size / 2) {
      console.log(`   - Changes are limited to few diagonals`);
    }
  }
  
  // Visual representation of the lattice changes
  console.log(`\n=== Visual representation of changes ===`);
  console.log(`'.' = unchanged, 'X' = changed`);
  for (let row = 0; row < size; row++) {
    let line = '';
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      line += initialState[idx] !== finalState[idx] ? 'X ' : '. ';
    }
    console.log(line);
  }
}

// Run the test
runFlipDistributionTest(12, 10000);

export {};