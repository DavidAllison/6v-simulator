/**
 * Browser Console Test Script for Button Alignment Verification
 * 
 * Instructions:
 * 1. Open http://localhost:5173 in your browser
 * 2. Open DevTools Console (F12)
 * 3. Copy and paste this entire script
 * 4. Review the test results
 */

(function() {
    console.clear();
    console.log('%c🔬 COLLAPSIBLE PANEL BUTTON ALIGNMENT TEST', 'background: #3b82f6; color: white; padding: 10px; font-size: 16px; font-weight: bold;');
    console.log('%cTest ID: CPA-001 | Date: 2025-08-21', 'color: #6b7280; font-style: italic;');
    console.log('─'.repeat(60));

    // Test configuration
    const TOLERANCE = 2; // pixels
    const TESTS_PASSED = [];
    const TESTS_FAILED = [];

    // Helper function to log results
    function logTest(name, passed, details) {
        const icon = passed ? '✅' : '❌';
        const color = passed ? 'color: #10b981' : 'color: #ef4444';
        console.log(`%c${icon} ${name}`, color, details || '');
        
        if (passed) {
            TESTS_PASSED.push(name);
        } else {
            TESTS_FAILED.push({ name, details });
        }
    }

    // Helper to get elements
    function getElements() {
        // Try multiple selectors to find the buttons
        const leftButton = document.querySelector('.collapsible-panel.left .collapse-toggle') ||
                          document.querySelector('[aria-label*="Collapse left panel"]') ||
                          document.querySelector('.left-panel-button');
                          
        const rightButton = document.querySelector('.collapsible-panel.right .collapse-toggle') ||
                           document.querySelector('[aria-label*="Collapse right panel"]') ||
                           document.querySelector('.right-panel-button');
                           
        const leftPanel = document.querySelector('.collapsible-panel.left') ||
                         document.querySelector('.control-panel')?.parentElement;
                         
        const rightPanel = document.querySelector('.collapsible-panel.right') ||
                          document.querySelector('.statistics-panel')?.parentElement;
                          
        const mainContent = document.querySelector('.main-content');

        return { leftButton, rightButton, leftPanel, rightPanel, mainContent };
    }

    // Test 1: Check if elements exist
    function testElementsExist() {
        console.log('\n%c📋 Test 1: Element Existence', 'font-weight: bold; font-size: 14px;');
        const { leftButton, rightButton, leftPanel, rightPanel, mainContent } = getElements();
        
        logTest('Left button exists', !!leftButton);
        logTest('Right button exists', !!rightButton);
        logTest('Left panel exists', !!leftPanel);
        logTest('Right panel exists', !!rightPanel);
        logTest('Main content exists', !!mainContent);
        
        return !!leftButton && !!rightButton && !!leftPanel && !!rightPanel && !!mainContent;
    }

    // Test 2: Check CSS Grid layout
    function testGridLayout() {
        console.log('\n%c📋 Test 2: CSS Grid Layout', 'font-weight: bold; font-size: 14px;');
        const { mainContent } = getElements();
        
        if (!mainContent) {
            logTest('Grid layout check', false, 'Main content not found');
            return false;
        }
        
        const styles = window.getComputedStyle(mainContent);
        const isGrid = styles.display === 'grid';
        const gridColumns = styles.gridTemplateColumns;
        const expectedColumns = gridColumns.includes('auto') && gridColumns.includes('1fr');
        
        logTest('Display is grid', isGrid, `display: ${styles.display}`);
        logTest('Grid columns correct', expectedColumns, `grid-template-columns: ${gridColumns}`);
        logTest('Align items stretch', styles.alignItems === 'stretch', `align-items: ${styles.alignItems}`);
        
        return isGrid && expectedColumns;
    }

    // Test 3: Button alignment in expanded state
    function testButtonAlignmentExpanded() {
        console.log('\n%c📋 Test 3: Button Alignment (Both Expanded)', 'font-weight: bold; font-size: 14px;');
        const { leftButton, rightButton, leftPanel, rightPanel } = getElements();
        
        if (!leftButton || !rightButton) {
            logTest('Button alignment', false, 'Buttons not found');
            return false;
        }
        
        // Ensure panels are expanded
        leftPanel?.classList.remove('collapsed');
        rightPanel?.classList.remove('collapsed');
        
        // Wait for transition
        setTimeout(() => {
            const leftRect = leftButton.getBoundingClientRect();
            const rightRect = rightButton.getBoundingClientRect();
            
            const yDiff = Math.abs(leftRect.top - rightRect.top);
            const heightDiff = Math.abs(leftRect.height - rightRect.height);
            
            logTest('Vertical position aligned', yDiff <= TOLERANCE, 
                    `Y difference: ${yDiff.toFixed(2)}px (tolerance: ${TOLERANCE}px)`);
            logTest('Button heights equal', heightDiff <= TOLERANCE,
                    `Height difference: ${heightDiff.toFixed(2)}px`);
            
            // Check CSS properties
            const leftStyles = window.getComputedStyle(leftButton);
            const rightStyles = window.getComputedStyle(rightButton);
            
            logTest('Left button top: 50%', leftStyles.top === '50%', `top: ${leftStyles.top}`);
            logTest('Right button top: 50%', rightStyles.top === '50%', `top: ${rightStyles.top}`);
            logTest('Transform includes translateY', 
                    leftStyles.transform.includes('translateY'),
                    `transform: ${leftStyles.transform}`);
            
            return yDiff <= TOLERANCE;
        }, 300);
    }

    // Test 4: Panel height equality
    function testPanelHeights() {
        console.log('\n%c📋 Test 4: Panel Height Equality', 'font-weight: bold; font-size: 14px;');
        const { leftPanel, rightPanel } = getElements();
        
        if (!leftPanel || !rightPanel) {
            logTest('Panel height check', false, 'Panels not found');
            return false;
        }
        
        const leftRect = leftPanel.getBoundingClientRect();
        const rightRect = rightPanel.getBoundingClientRect();
        const heightDiff = Math.abs(leftRect.height - rightRect.height);
        
        logTest('Panels have equal height', heightDiff <= TOLERANCE,
                `Height difference: ${heightDiff.toFixed(2)}px`);
        logTest('Left panel height', true, `${leftRect.height.toFixed(2)}px`);
        logTest('Right panel height', true, `${rightRect.height.toFixed(2)}px`);
        
        return heightDiff <= TOLERANCE;
    }

    // Test 5: Button centering at 50%
    function testButtonCentering() {
        console.log('\n%c📋 Test 5: Button 50% Centering', 'font-weight: bold; font-size: 14px;');
        const { leftButton, rightButton, mainContent } = getElements();
        
        if (!leftButton || !rightButton || !mainContent) {
            logTest('Button centering check', false, 'Elements not found');
            return false;
        }
        
        const mainRect = mainContent.getBoundingClientRect();
        const leftRect = leftButton.getBoundingClientRect();
        const rightRect = rightButton.getBoundingClientRect();
        
        const containerCenterY = mainRect.top + (mainRect.height / 2);
        const leftCenterY = leftRect.top + (leftRect.height / 2);
        const rightCenterY = rightRect.top + (rightRect.height / 2);
        
        const leftOffset = Math.abs(leftCenterY - containerCenterY);
        const rightOffset = Math.abs(rightCenterY - containerCenterY);
        
        logTest('Left button centered', leftOffset <= TOLERANCE * 2,
                `Offset from center: ${leftOffset.toFixed(2)}px`);
        logTest('Right button centered', rightOffset <= TOLERANCE * 2,
                `Offset from center: ${rightOffset.toFixed(2)}px`);
        
        return leftOffset <= TOLERANCE * 2 && rightOffset <= TOLERANCE * 2;
    }

    // Test 6: Collapsed state alignment
    function testCollapsedAlignment() {
        console.log('\n%c📋 Test 6: Button Alignment (Collapsed State)', 'font-weight: bold; font-size: 14px;');
        const { leftButton, rightButton, leftPanel, rightPanel } = getElements();
        
        if (!leftButton || !rightButton || !leftPanel || !rightPanel) {
            logTest('Collapsed state test', false, 'Elements not found');
            return false;
        }
        
        // Test with left collapsed
        leftPanel.classList.add('collapsed');
        rightPanel.classList.remove('collapsed');
        
        setTimeout(() => {
            let leftRect = leftButton.getBoundingClientRect();
            let rightRect = rightButton.getBoundingClientRect();
            let yDiff = Math.abs(leftRect.top - rightRect.top);
            
            logTest('Aligned with left collapsed', yDiff <= TOLERANCE,
                    `Y difference: ${yDiff.toFixed(2)}px`);
            
            // Test with right collapsed
            leftPanel.classList.remove('collapsed');
            rightPanel.classList.add('collapsed');
            
            setTimeout(() => {
                leftRect = leftButton.getBoundingClientRect();
                rightRect = rightButton.getBoundingClientRect();
                yDiff = Math.abs(leftRect.top - rightRect.top);
                
                logTest('Aligned with right collapsed', yDiff <= TOLERANCE,
                        `Y difference: ${yDiff.toFixed(2)}px`);
                
                // Test with both collapsed
                leftPanel.classList.add('collapsed');
                rightPanel.classList.add('collapsed');
                
                setTimeout(() => {
                    leftRect = leftButton.getBoundingClientRect();
                    rightRect = rightButton.getBoundingClientRect();
                    yDiff = Math.abs(leftRect.top - rightRect.top);
                    
                    logTest('Aligned with both collapsed', yDiff <= TOLERANCE,
                            `Y difference: ${yDiff.toFixed(2)}px`);
                    
                    // Reset to expanded
                    leftPanel.classList.remove('collapsed');
                    rightPanel.classList.remove('collapsed');
                }, 300);
            }, 300);
        }, 300);
        
        return true;
    }

    // Run all tests
    function runAllTests() {
        const allElementsExist = testElementsExist();
        
        if (!allElementsExist) {
            console.error('%c⚠️ Cannot continue tests - required elements not found', 'color: #ef4444; font-weight: bold;');
            console.log('%cMake sure you are on the correct page (http://localhost:5173)', 'color: #6b7280;');
            return;
        }
        
        testGridLayout();
        testButtonAlignmentExpanded();
        testPanelHeights();
        testButtonCentering();
        testCollapsedAlignment();
        
        // Display summary after all async tests complete
        setTimeout(() => {
            console.log('\n' + '═'.repeat(60));
            console.log('%c📊 TEST SUMMARY', 'background: #1f2937; color: white; padding: 5px; font-size: 14px; font-weight: bold;');
            console.log('─'.repeat(60));
            
            const totalTests = TESTS_PASSED.length + TESTS_FAILED.length;
            const passRate = ((TESTS_PASSED.length / totalTests) * 100).toFixed(1);
            
            console.log(`Total Tests: ${totalTests}`);
            console.log(`%cPassed: ${TESTS_PASSED.length}`, 'color: #10b981; font-weight: bold;');
            console.log(`%cFailed: ${TESTS_FAILED.length}`, 'color: #ef4444; font-weight: bold;');
            console.log(`Pass Rate: ${passRate}%`);
            
            if (TESTS_FAILED.length > 0) {
                console.log('\n%c❌ Failed Tests:', 'color: #ef4444; font-weight: bold;');
                TESTS_FAILED.forEach(test => {
                    console.log(`  - ${test.name}: ${test.details}`);
                });
            }
            
            if (TESTS_PASSED.length === totalTests) {
                console.log('\n%c🎉 ALL TESTS PASSED! Button alignment is working correctly.', 
                           'background: #10b981; color: white; padding: 10px; font-size: 14px; font-weight: bold;');
            } else {
                console.log('\n%c⚠️ Some tests failed. Review the button alignment implementation.', 
                           'background: #ef4444; color: white; padding: 10px; font-size: 14px; font-weight: bold;');
            }
            
            console.log('\n%cTest completed at: ' + new Date().toLocaleTimeString(), 'color: #6b7280; font-style: italic;');
            console.log('═'.repeat(60));
        }, 2000);
    }

    // Start tests
    runAllTests();
})();