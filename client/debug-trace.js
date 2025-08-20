// Trace what's happening with DWBC generation
import fs from 'fs';

// Read all the DWBC-related files
const files = [
  './src/lib/six-vertex/initialStates.ts',
  './src/lib/six-vertex/initialStatesFix.ts',
  './src/lib/six-vertex/initialStatesCorrect.ts'
];

console.log('=== DWBC Implementation Files ===\n');

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    console.log(`\n${file}:`);
    console.log('-'.repeat(50));
    
    // Find the main export function
    lines.forEach((line, i) => {
      if (line.includes('export function generateDWBC')) {
        console.log(`Line ${i+1}: ${line.trim()}`);
        // Show next 5 lines
        for (let j = 1; j <= 5 && i+j < lines.length; j++) {
          console.log(`Line ${i+j+1}: ${lines[i+j].trim()}`);
        }
      }
    });
  } catch (e) {
    console.log(`  Error reading file: ${e.message}`);
  }
});

// Now check which one is actually being used
console.log('\n\n=== Checking Active Implementation ===\n');

const mainFile = fs.readFileSync('./src/lib/six-vertex/initialStates.ts', 'utf8');
const mainLines = mainFile.split('\n');

mainLines.forEach((line, i) => {
  if (line.includes('export function generateDWBCHigh') || 
      line.includes('export function generateDWBCLow')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
    for (let j = 1; j <= 3 && i+j < mainLines.length; j++) {
      console.log(`  ${mainLines[i+j].trim()}`);
    }
    console.log();
  }
});