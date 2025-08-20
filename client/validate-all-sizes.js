// Comprehensive validation of DWBC generation for all sizes
import { generateDWBCHighFinal, generateDWBCLowFinal } from './src/lib/six-vertex/dwbcFinal.js';

console.log('=== DWBC Validation Test Suite ===\n');

function validateDWBCHigh(size) {
  console.log(`\nTesting DWBC High for ${size}x${size}:`);
  
  const state = generateDWBCHighFinal(size);
  
  // Count vertex types
  const counts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0 };
  let c2OnAntiDiag = 0;
  let c2OffAntiDiag = 0;
  
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const vertex = state.vertices[row][col];
      counts[vertex.type]++;
      
      if (vertex.type === 'c2') {
        if (row + col === size - 1) {
          c2OnAntiDiag++;
        } else {
          c2OffAntiDiag++;
        }
      }
    }
  }
  
  // Validate results
  const expectedC2 = size;
  const expectedB1 = (size * (size - 1)) / 2;
  const expectedB2 = (size * (size - 1)) / 2;
  
  console.log(`  Expected: c2=${expectedC2}, b1=${expectedB1}, b2=${expectedB2}`);
  console.log(`  Actual:   c2=${counts.c2}, b1=${counts.b1}, b2=${counts.b2}`);
  console.log(`  c2 placement: ${c2OnAntiDiag} on anti-diagonal, ${c2OffAntiDiag} off (should be 0)`);
  
  const passed = counts.c2 === expectedC2 && 
                 counts.b1 === expectedB1 && 
                 counts.b2 === expectedB2 && 
                 c2OffAntiDiag === 0;
  
  console.log(`  Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  return passed;
}

function validateDWBCLow(size) {
  console.log(`\nTesting DWBC Low for ${size}x${size}:`);
  
  const state = generateDWBCLowFinal(size);
  
  // Count vertex types
  const counts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0 };
  let c2OnMainDiag = 0;
  let c2OffMainDiag = 0;
  
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const vertex = state.vertices[row][col];
      counts[vertex.type]++;
      
      if (vertex.type === 'c2') {
        if (row === col) {
          c2OnMainDiag++;
        } else {
          c2OffMainDiag++;
        }
      }
    }
  }
  
  // Validate results
  const expectedC2 = size;
  const expectedA1 = (size * (size - 1)) / 2;
  const expectedA2 = (size * (size - 1)) / 2;
  
  console.log(`  Expected: c2=${expectedC2}, a1=${expectedA1}, a2=${expectedA2}`);
  console.log(`  Actual:   c2=${counts.c2}, a1=${counts.a1}, a2=${counts.a2}`);
  console.log(`  c2 placement: ${c2OnMainDiag} on main diagonal, ${c2OffMainDiag} off (should be 0)`);
  
  const passed = counts.c2 === expectedC2 && 
                 counts.a1 === expectedA1 && 
                 counts.a2 === expectedA2 && 
                 c2OffMainDiag === 0;
  
  console.log(`  Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  return passed;
}

// Test various sizes
const testSizes = [4, 6, 8, 10, 12, 16, 20, 24, 32];
let allPassed = true;

console.log('\n=== Testing DWBC High ===');
for (const size of testSizes) {
  if (!validateDWBCHigh(size)) {
    allPassed = false;
  }
}

console.log('\n=== Testing DWBC Low ===');
for (const size of testSizes) {
  if (!validateDWBCLow(size)) {
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(50));
console.log(allPassed ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
console.log('='.repeat(50));