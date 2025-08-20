// Test ice rule for DWBC states
import { generateDWBCHighFinal, generateDWBCLowFinal } from './src/lib/six-vertex/dwbcFinal.js';
import { EdgeState } from './src/lib/six-vertex/types.js';

function checkIceRule(state, name) {
  console.log(`\n=== Checking Ice Rule for ${name} (${state.width}x${state.height}) ===`);
  
  let violations = [];
  
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];
      const config = vertex.configuration;
      
      // Count ins and outs
      const edges = [config.left, config.right, config.top, config.bottom];
      const ins = edges.filter(e => e === EdgeState.In).length;
      const outs = edges.filter(e => e === EdgeState.Out).length;
      
      if (ins !== 2 || outs !== 2) {
        violations.push({
          row, col,
          type: vertex.type,
          ins, outs,
          config: {
            left: config.left === EdgeState.In ? 'IN' : 'OUT',
            right: config.right === EdgeState.In ? 'IN' : 'OUT',
            top: config.top === EdgeState.In ? 'IN' : 'OUT',
            bottom: config.bottom === EdgeState.In ? 'IN' : 'OUT',
          }
        });
      }
    }
  }
  
  if (violations.length === 0) {
    console.log('✅ Ice rule satisfied for all vertices!');
  } else {
    console.log(`❌ Ice rule violated at ${violations.length} vertices:`);
    violations.slice(0, 5).forEach(v => {
      console.log(`  (${v.row},${v.col}) type=${v.type}: ${v.ins} ins, ${v.outs} outs`);
      console.log(`    left=${v.config.left}, right=${v.config.right}, top=${v.config.top}, bottom=${v.config.bottom}`);
    });
    if (violations.length > 5) {
      console.log(`  ... and ${violations.length - 5} more violations`);
    }
  }
  
  // Also check boundary arrow counts
  console.log('\nBoundary arrow counts:');
  
  // Top boundary
  let topIn = 0, topOut = 0;
  for (let col = 0; col < state.width; col++) {
    if (state.verticalEdges[0][col] === EdgeState.In) topIn++;
    else topOut++;
  }
  console.log(`  Top: ${topIn} in, ${topOut} out`);
  
  // Bottom boundary
  let bottomIn = 0, bottomOut = 0;
  for (let col = 0; col < state.width; col++) {
    if (state.verticalEdges[state.height][col] === EdgeState.In) bottomIn++;
    else bottomOut++;
  }
  console.log(`  Bottom: ${bottomIn} in, ${bottomOut} out`);
  
  // Left boundary
  let leftIn = 0, leftOut = 0;
  for (let row = 0; row < state.height; row++) {
    if (state.horizontalEdges[row][0] === EdgeState.In) leftIn++;
    else leftOut++;
  }
  console.log(`  Left: ${leftIn} in, ${leftOut} out`);
  
  // Right boundary
  let rightIn = 0, rightOut = 0;
  for (let row = 0; row < state.height; row++) {
    if (state.horizontalEdges[row][state.width] === EdgeState.In) rightIn++;
    else rightOut++;
  }
  console.log(`  Right: ${rightIn} in, ${rightOut} out`);
  
  return violations.length === 0;
}

// Test different sizes
const sizes = [4, 6, 8, 10];

for (const size of sizes) {
  const high = generateDWBCHighFinal(size);
  checkIceRule(high, `DWBC High ${size}x${size}`);
  
  const low = generateDWBCLowFinal(size);
  checkIceRule(low, `DWBC Low ${size}x${size}`);
}