// Paste this script in the browser console at http://localhost:5173 to verify collapsible panels

console.log('=== Verifying Collapsible Panels ===');

// Check if panels exist
const leftPanel = document.querySelector('.collapsible-panel.left');
const rightPanel = document.querySelector('.collapsible-panel.right');

if (!leftPanel || !rightPanel) {
  console.error('❌ Panels not found!');
  console.log('Left panel:', leftPanel);
  console.log('Right panel:', rightPanel);
} else {
  console.log('✅ Both panels found');

  // Check collapse buttons
  const leftButton = leftPanel.querySelector('.collapse-toggle');
  const rightButton = rightPanel.querySelector('.collapse-toggle');

  if (!leftButton || !rightButton) {
    console.error('❌ Collapse buttons not found!');
  } else {
    console.log('✅ Both collapse buttons found');

    // Check current state
    const leftCollapsed = leftPanel.classList.contains('collapsed');
    const rightCollapsed = rightPanel.classList.contains('collapsed');

    console.log(`Left panel: ${leftCollapsed ? 'COLLAPSED' : 'EXPANDED'}`);
    console.log(`Right panel: ${rightCollapsed ? 'COLLAPSED' : 'EXPANDED'}`);

    // Check localStorage
    console.log('\n=== LocalStorage Check ===');
    const leftStorage = localStorage.getItem('panel-collapsed-controls');
    const rightStorage = localStorage.getItem('panel-collapsed-info');

    console.log(`Left panel localStorage: ${leftStorage}`);
    console.log(`Right panel localStorage: ${rightStorage}`);

    // Check arrow directions
    const leftIcon = leftButton.querySelector('.toggle-icon');
    const rightIcon = rightButton.querySelector('.toggle-icon');

    console.log('\n=== Arrow Icons ===');
    console.log(
      `Left panel arrow: "${leftIcon?.textContent}" (should be ${leftCollapsed ? '▶' : '◀'})`,
    );
    console.log(
      `Right panel arrow: "${rightIcon?.textContent}" (should be ${rightCollapsed ? '◀' : '▶'})`,
    );

    // Test collapse functionality
    console.log('\n=== Testing Collapse Functionality ===');
    console.log('Click the buttons manually and run this script again to verify state changes.');
    console.log(
      'Or run: document.querySelector(".collapsible-panel.left .collapse-toggle").click()',
    );
  }
}

// Check for any errors in StatisticsPanel
const statsPanel = document.querySelector('.statistics-panel');
if (!statsPanel) {
  console.error('❌ Statistics panel not rendered - this was the main issue!');
} else {
  console.log('✅ Statistics panel is rendering correctly');

  // Check FPS display
  const fpsValue = statsPanel.querySelector('.stat-value');
  if (fpsValue && fpsValue.textContent !== undefined) {
    console.log('✅ FPS value is displayed:', fpsValue.textContent);
  }
}

console.log('\n=== Verification Complete ===');
