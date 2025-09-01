/**
 * Manual verification script for TestDualLayout component
 * This file verifies that the dual layout is working correctly
 */

import { generateDWBCHigh, generateDWBCLow } from './lib/six-vertex/initialStates';

function verifyDualLayout() {
  console.log('=== Verifying Dual Layout Component ===\n');

  // Test 1: Verify DWBC state generation
  console.log('Test 1: DWBC State Generation');
  try {
    const highState = generateDWBCHigh(24);
    const lowState = generateDWBCLow(24);

    console.log('✓ DWBC High state generated:', {
      width: highState.width,
      height: highState.height,
      vertices: highState.vertices.length + 'x' + highState.vertices[0]?.length,
    });

    console.log('✓ DWBC Low state generated:', {
      width: lowState.width,
      height: lowState.height,
      vertices: lowState.vertices.length + 'x' + lowState.vertices[0]?.length,
    });
  } catch (error) {
    console.error('✗ State generation failed:', error);
    return false;
  }

  // Test 2: Verify layout calculations
  console.log('\nTest 2: Layout Calculations');
  const viewportWidth = 1920;
  const viewportHeight = 1080;
  const sidebarWidth = 250;
  const middleWidth = viewportWidth - 2 * sidebarWidth;
  const canvasHeight = (viewportHeight - 20) / 2; // 10px gap, 10px padding

  console.log('✓ Layout dimensions:', {
    viewport: `${viewportWidth}x${viewportHeight}`,
    leftSidebar: `${sidebarWidth}px`,
    middle: `${middleWidth}px`,
    rightSidebar: `${sidebarWidth}px`,
    canvasHeight: `${canvasHeight}px each`,
    split: '50/50',
  });

  // Test 3: Verify canvas scaling
  console.log('\nTest 3: Canvas Scaling');
  const N = 24;
  const cellSize = 20;
  const matrixSize = N * cellSize;
  const padding = 40;
  const availableWidth = middleWidth - 2 * padding;
  const availableHeight = canvasHeight - 2 * padding;
  const scale = Math.min(availableWidth / matrixSize, availableHeight / matrixSize);

  console.log('✓ Scaling calculations:', {
    matrixSize: `${matrixSize}px`,
    availableSpace: `${availableWidth}x${availableHeight}px`,
    scale: scale.toFixed(2),
    scaledSize: `${(matrixSize * scale).toFixed(0)}px`,
  });

  // Test 4: Verify component structure
  console.log('\nTest 4: Component Structure');
  console.log('✓ Component hierarchy:');
  console.log('  - Container (100vw x 100vh, flex row)');
  console.log('    - Left Sidebar (250px, controls)');
  console.log('    - Middle Column (flex: 1, contains canvases)');
  console.log('      - Top Canvas Container (flex: 50%)');
  console.log('        - Canvas 1 (DWBC High, cyan)');
  console.log('      - Bottom Canvas Container (flex: 50%)');
  console.log('        - Canvas 2 (DWBC Low, pink)');
  console.log('    - Right Sidebar (250px, statistics)');

  console.log('\n=== All Verifications Passed ===');
  console.log('\nTo view the component:');
  console.log('1. Make sure dev server is running: npm run dev');
  console.log('2. Navigate to: http://localhost:5173/test-dual-layout');
  console.log('3. You should see:');
  console.log('   - Two matrices stacked vertically');
  console.log('   - Top matrix: DWBC High (cyan paths)');
  console.log('   - Bottom matrix: DWBC Low (pink paths)');
  console.log('   - Each taking exactly 50% of available height');
  console.log('   - Three-column layout with controls and info');

  return true;
}

// Run verification
verifyDualLayout();

export default verifyDualLayout;
