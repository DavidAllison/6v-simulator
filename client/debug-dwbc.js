#!/usr/bin/env node

/**
 * Debug script to verify DWBC patterns match the paper
 * Standalone version that recreates the logic without imports
 */

// Recreate the vertex type enum
const VertexType = {
  a1: 'a1',
  a2: 'a2',
  b1: 'b1',
  b2: 'b2',
  c1: 'c1',
  c2: 'c2',
};

const EdgeState = {
  In: 'in',
  Out: 'out',
};

// Recreate getVertexConfiguration
function getVertexConfiguration(type) {
  switch (type) {
    case VertexType.a1:
      return {
        left: EdgeState.In,
        top: EdgeState.In,
        right: EdgeState.Out,
        bottom: EdgeState.Out,
      };
    case VertexType.a2:
      return {
        right: EdgeState.In,
        bottom: EdgeState.In,
        left: EdgeState.Out,
        top: EdgeState.Out,
      };
    case VertexType.b1:
      return {
        left: EdgeState.In,
        right: EdgeState.In,
        top: EdgeState.Out,
        bottom: EdgeState.Out,
      };
    case VertexType.b2:
      return {
        top: EdgeState.In,
        bottom: EdgeState.In,
        left: EdgeState.Out,
        right: EdgeState.Out,
      };
    case VertexType.c1:
      return {
        left: EdgeState.In,
        bottom: EdgeState.In,
        right: EdgeState.Out,
        top: EdgeState.Out,
      };
    case VertexType.c2:
      return {
        right: EdgeState.In,
        top: EdgeState.In,
        left: EdgeState.Out,
        bottom: EdgeState.Out,
      };
  }
}

// Recreate generateDWBCHigh
function generateDWBCHigh(size) {
  const vertices = [];
  const horizontalEdges = [];
  const verticalEdges = [];
  
  // Initialize edge arrays
  for (let row = 0; row <= size; row++) {
    horizontalEdges[row] = new Array(size + 1);
    verticalEdges[row] = new Array(size + 1);
  }
  
  // DWBC High boundary conditions:
  // Top boundary: all arrows point down (into lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = EdgeState.In;
  }
  
  // Bottom boundary: all arrows point down (out of lattice) 
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = EdgeState.Out;
  }
  
  // Left boundary: all arrows point right (out of boundary, into lattice)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = EdgeState.Out;
  }
  
  // Right boundary: all arrows point right (into boundary, out of lattice)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = EdgeState.In;
  }
  
  // Create vertices according to Figure 2 pattern
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      let type;
      
      // Anti-diagonal has c2 vertices
      if (row + col === size - 1) {
        type = VertexType.c2;
      }
      // Upper-left triangle has b1 vertices
      else if (row + col < size - 1) {
        type = VertexType.b1;
      }
      // Lower-right triangle has b2 vertices
      else {
        type = VertexType.b2;
      }
      
      // Get the configuration for this vertex type
      const configuration = getVertexConfiguration(type);
      
      // Set interior edges based on vertex configuration
      // Right edge (if not at boundary)
      if (col < size - 1) {
        horizontalEdges[row][col + 1] = configuration.right;
      }
      
      // Bottom edge (if not at boundary)
      if (row < size - 1) {
        verticalEdges[row + 1][col] = configuration.bottom;
      }
      
      vertices[row][col] = {
        position: { row, col },
        type,
        configuration,
      };
    }
  }
  
  return {
    width: size,
    height: size,
    vertices,
    horizontalEdges,
    verticalEdges,
  };
}

// Recreate generateDWBCLow
function generateDWBCLow(size) {
  const vertices = [];
  const horizontalEdges = [];
  const verticalEdges = [];
  
  // Initialize edge arrays
  for (let row = 0; row <= size; row++) {
    horizontalEdges[row] = new Array(size + 1);
    verticalEdges[row] = new Array(size + 1);
  }
  
  // DWBC Low boundary conditions (opposite of High):
  // Top boundary: all arrows point up (out of lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = EdgeState.Out;
  }
  
  // Bottom boundary: all arrows point up (into lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = EdgeState.In;
  }
  
  // Left boundary: all arrows point left (into boundary)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = EdgeState.In;
  }
  
  // Right boundary: all arrows point left (out of boundary)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = EdgeState.Out;
  }
  
  // Create vertices according to Figure 3 pattern
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      let type;
      
      // Main diagonal has c2 vertices
      if (row === col) {
        type = VertexType.c2;
      }
      // Upper-right triangle has a1 vertices
      else if (col > row) {
        type = VertexType.a1;
      }
      // Lower-left triangle has a2 vertices
      else {
        type = VertexType.a2;
      }
      
      // Get the configuration for this vertex type
      const configuration = getVertexConfiguration(type);
      
      // Set interior edges based on vertex configuration
      // Right edge (if not at boundary)
      if (col < size - 1) {
        horizontalEdges[row][col + 1] = configuration.right;
      }
      
      // Bottom edge (if not at boundary)
      if (row < size - 1) {
        verticalEdges[row + 1][col] = configuration.bottom;
      }
      
      vertices[row][col] = {
        position: { row, col },
        type,
        configuration,
      };
    }
  }
  
  return {
    width: size,
    height: size,
    vertices,
    horizontalEdges,
    verticalEdges,
  };
}

// Expected patterns from the paper
const EXPECTED_DWBC_HIGH = [
  ['b1', 'b1', 'b1', 'b1', 'b1', 'c2'],
  ['b1', 'b1', 'b1', 'b1', 'c2', 'b2'],
  ['b1', 'b1', 'b1', 'c2', 'b2', 'b2'],
  ['b1', 'b1', 'c2', 'b2', 'b2', 'b2'],
  ['b1', 'c2', 'b2', 'b2', 'b2', 'b2'],
  ['c2', 'b2', 'b2', 'b2', 'b2', 'b2']
];

const EXPECTED_DWBC_LOW = [
  ['c2', 'a1', 'a1', 'a1', 'a1', 'a1'],
  ['a2', 'c2', 'a1', 'a1', 'a1', 'a1'],
  ['a2', 'a2', 'c2', 'a1', 'a1', 'a1'],
  ['a2', 'a2', 'a2', 'c2', 'a1', 'a1'],
  ['a2', 'a2', 'a2', 'a2', 'c2', 'a1'],
  ['a2', 'a2', 'a2', 'a2', 'a2', 'c2']
];

function printMatrix(title, matrix) {
  console.log(`\n${title}:`);
  console.log('```');
  for (let row of matrix) {
    console.log(row.join(' '));
  }
  console.log('```');
}

function extractVertexTypes(latticeState) {
  const matrix = [];
  for (let row = 0; row < latticeState.height; row++) {
    const rowTypes = [];
    for (let col = 0; col < latticeState.width; col++) {
      rowTypes.push(latticeState.vertices[row][col].type);
    }
    matrix.push(rowTypes);
  }
  return matrix;
}

function compareMatrices(actual, expected, label) {
  console.log(`\n=== Comparing ${label} ===`);
  
  let matches = true;
  for (let row = 0; row < expected.length; row++) {
    for (let col = 0; col < expected[row].length; col++) {
      if (actual[row][col] !== expected[row][col]) {
        console.log(`Mismatch at [${row},${col}]: actual=${actual[row][col]}, expected=${expected[row][col]}`);
        matches = false;
      }
    }
  }
  
  if (matches) {
    console.log('Perfect match with paper!');
  } else {
    console.log('Does NOT match paper');
  }
  
  return matches;
}

function printEdgeBoundaries(state, label) {
  console.log(`\n=== ${label} Boundary Edges ===`);
  
  // Top boundary
  console.log('Top boundary (row 0):');
  const topEdges = [];
  for (let col = 0; col < state.width; col++) {
    topEdges.push(state.verticalEdges[0][col]);
  }
  console.log('  ', topEdges.join(' '));
  
  // Bottom boundary  
  console.log('Bottom boundary (row N):');
  const bottomEdges = [];
  for (let col = 0; col < state.width; col++) {
    bottomEdges.push(state.verticalEdges[state.height][col]);
  }
  console.log('  ', bottomEdges.join(' '));
  
  // Left boundary
  console.log('Left boundary (col 0):');
  const leftEdges = [];
  for (let row = 0; row < state.height; row++) {
    leftEdges.push(state.horizontalEdges[row][0]);
  }
  console.log('  ', leftEdges.join(' '));
  
  // Right boundary
  console.log('Right boundary (col N):');
  const rightEdges = [];
  for (let row = 0; row < state.height; row++) {
    rightEdges.push(state.horizontalEdges[row][state.width]);
  }
  console.log('  ', rightEdges.join(' '));
}

// Main execution
console.log('========================================');
console.log('DWBC Pattern Debug Script');
console.log('========================================');

console.log('\nGenerating 6x6 lattices...');

// Generate DWBC High
const dwbcHigh = generateDWBCHigh(6);
const actualHigh = extractVertexTypes(dwbcHigh);

// Generate DWBC Low
const dwbcLow = generateDWBCLow(6);
const actualLow = extractVertexTypes(dwbcLow);

// Print actual generated patterns
printMatrix('Generated DWBC High', actualHigh);
printMatrix('Expected DWBC High (from paper Figure 2)', EXPECTED_DWBC_HIGH);

printMatrix('Generated DWBC Low', actualLow);
printMatrix('Expected DWBC Low (from paper Figure 3)', EXPECTED_DWBC_LOW);

// Compare and report
const highMatches = compareMatrices(actualHigh, EXPECTED_DWBC_HIGH, 'DWBC High');
const lowMatches = compareMatrices(actualLow, EXPECTED_DWBC_LOW, 'DWBC Low');

// Print boundary conditions for debugging
printEdgeBoundaries(dwbcHigh, 'DWBC High');
printEdgeBoundaries(dwbcLow, 'DWBC Low');

// Summary
console.log('\n========================================');
console.log('SUMMARY');
console.log('========================================');
if (highMatches && lowMatches) {
  console.log('All DWBC patterns match the paper exactly!');
} else {
  console.log('DWBC patterns do not match the paper');
  if (!highMatches) console.log('  - DWBC High needs fixing');
  if (!lowMatches) console.log('  - DWBC Low needs fixing');
}

// Additional diagnostics - check ice rule
console.log('\n=== Ice Rule Validation ===');

function checkIceRule(state, label) {
  console.log(`\nChecking ${label}:`);
  let valid = true;
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];
      const config = vertex.configuration;
      
      const ins = [config.left, config.right, config.top, config.bottom]
        .filter(e => e === 'in').length;
      const outs = [config.left, config.right, config.top, config.bottom]
        .filter(e => e === 'out').length;
        
      if (ins !== 2 || outs !== 2) {
        console.log(`Ice rule violated at [${row},${col}]: ${ins} ins, ${outs} outs`);
        valid = false;
      }
    }
  }
  if (valid) {
    console.log('Ice rule satisfied for all vertices');
  }
  return valid;
}

checkIceRule(dwbcHigh, 'DWBC High');
checkIceRule(dwbcLow, 'DWBC Low');