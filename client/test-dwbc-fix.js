// Test the DWBC fix directly
import { generateDWBCHighFixed } from './src/lib/six-vertex/initialStatesFix.js';

function testDWBC(size) {
  console.log(`\nTesting DWBC High for ${size}x${size}:`);
  
  const state = generateDWBCHighFixed(size);
  
  // Count vertex types
  const counts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0 };
  
  for (let row = 0; row < size; row++) {
    const rowTypes = [];
    for (let col = 0; col < size; col++) {
      const vertex = state.vertices[row][col];
      counts[vertex.type]++;
      rowTypes.push(vertex.type.padEnd(2));
    }
    console.log(rowTypes.join(' '));
  }
  
  console.log('\nVertex counts:');
  console.log(`  c2 (should be ${size} for anti-diagonal): ${counts.c2}`);
  console.log(`  b1 (upper-left triangle): ${counts.b1}`);
  console.log(`  b2 (lower-right triangle): ${counts.b2}`);
  console.log(`  a1/a2 (should be 0): ${counts.a1}/${counts.a2}`);
  
  // Check if c2 vertices are only on anti-diagonal
  let c2OnAntiDiag = 0;
  let c2OffAntiDiag = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (state.vertices[row][col].type === 'c2') {
        if (row + col === size - 1) {
          c2OnAntiDiag++;
        } else {
          c2OffAntiDiag++;
        }
      }
    }
  }
  
  console.log(`\nc2 placement check:`);
  console.log(`  On anti-diagonal: ${c2OnAntiDiag}`);
  console.log(`  OFF anti-diagonal (ERROR if > 0): ${c2OffAntiDiag}`);
}

// Test different sizes
testDWBC(6);
testDWBC(8);
testDWBC(10);
testDWBC(12);