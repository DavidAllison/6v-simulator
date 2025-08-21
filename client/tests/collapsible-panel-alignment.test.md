# Collapsible Panel Button Alignment Test Plan

## Test ID: CPA-001
**Date:** 2025-08-21
**Tester:** QA Test Engineer
**Component:** CollapsiblePanel Button Positioning
**Severity:** SEV3 (Major - UI/UX issue affecting visual consistency)

## Test Objective
Verify that the collapse/expand buttons for both left and right panels are perfectly aligned at the same vertical position after the CSS Grid layout fix.

## Prerequisites
1. Development server running at http://localhost:5173
2. Browser DevTools available for inspection
3. Multiple browsers available for cross-browser testing

## Test Environment
- **Browsers:** Chrome (latest), Firefox (latest), Safari (latest), Edge (latest)
- **Viewports:** Desktop (1920x1080, 1440x900, 1366x768), Tablet (768x1024), Mobile (375x667, 414x896)
- **OS:** macOS, Windows, Linux (if available)

## Test Cases

### TC-001: Button Alignment - Both Panels Expanded
**Priority:** P1
**Steps:**
1. Navigate to http://localhost:5173
2. Ensure both left and right panels are expanded (default state)
3. Open browser DevTools
4. Inspect the left panel collapse button element
5. Note the computed `top` position and transformed Y position
6. Inspect the right panel collapse button element
7. Note the computed `top` position and transformed Y position

**Expected Results:**
- Both buttons should have `top: 50%` CSS property
- Both buttons should have `transform: translateY(-50%)` CSS property
- Visual inspection shows buttons aligned horizontally at the same height
- The computed offsetTop values should be equal (±2px tolerance for rounding)

**Acceptance Criteria:**
- [ ] Buttons visually aligned at same height
- [ ] CSS properties match expected values
- [ ] No visual misalignment across different content heights

### TC-002: Button Alignment - Left Panel Collapsed, Right Panel Expanded
**Priority:** P1
**Steps:**
1. Navigate to http://localhost:5173
2. Click the left panel collapse button to collapse it
3. Observe the button positions
4. Measure button vertical positions using DevTools ruler or screenshot

**Expected Results:**
- Buttons remain at the same vertical position
- Left button stays centered vertically on collapsed panel
- Right button stays centered vertically on expanded panel
- No vertical shift during collapse animation

**Acceptance Criteria:**
- [ ] Buttons maintain same Y-axis position
- [ ] Smooth animation without jumping
- [ ] Visual alignment preserved

### TC-003: Button Alignment - Left Panel Expanded, Right Panel Collapsed
**Priority:** P1
**Steps:**
1. Navigate to http://localhost:5173
2. Click the right panel collapse button to collapse it
3. Observe the button positions
4. Measure button vertical positions

**Expected Results:**
- Buttons remain at the same vertical position
- Animation is smooth without vertical jumping
- Both buttons centered at 50% of container height

**Acceptance Criteria:**
- [ ] Buttons maintain alignment
- [ ] No visual artifacts during transition
- [ ] Consistent positioning

### TC-004: Button Alignment - Both Panels Collapsed
**Priority:** P1
**Steps:**
1. Navigate to http://localhost:5173
2. Collapse both panels
3. Verify button positions

**Expected Results:**
- Both buttons at same vertical position
- Minimal collapsed state maintains alignment
- Buttons remain clickable and accessible

**Acceptance Criteria:**
- [ ] Visual alignment maintained
- [ ] Buttons functional in collapsed state
- [ ] No overlap or positioning issues

### TC-005: Responsive Behavior - 1440px Viewport
**Priority:** P2
**Steps:**
1. Set browser window to 1440px width
2. Test all combinations of expanded/collapsed states
3. Verify button alignment

**Expected Results:**
- Grid layout maintains equal height columns
- Buttons remain aligned at all states
- Responsive adjustments don't break alignment

**Acceptance Criteria:**
- [ ] Alignment preserved at 1440px
- [ ] Grid layout functioning correctly
- [ ] No layout shifts

### TC-006: Responsive Behavior - 1200px Breakpoint
**Priority:** P2
**Steps:**
1. Set browser window to 1200px width
2. Verify layout switches from grid to flex
3. Test panel collapse/expand
4. Check button positioning

**Expected Results:**
- Layout switches to vertical stack at ≤1200px
- Buttons adapt to new layout appropriately
- Mobile-specific styles apply correctly

**Acceptance Criteria:**
- [ ] Proper breakpoint behavior
- [ ] Buttons positioned correctly for mobile
- [ ] Smooth responsive transition

### TC-007: Responsive Behavior - 768px Mobile
**Priority:** P2
**Steps:**
1. Set viewport to 768px width
2. Test panel interactions
3. Verify mobile-specific button styling

**Expected Results:**
- Horizontal collapse buttons (full width)
- Panel title visible when collapsed
- Touch-friendly button sizing

**Acceptance Criteria:**
- [ ] Mobile layout correct
- [ ] Buttons accessible on touch devices
- [ ] Collapsed titles visible

### TC-008: Animation Smoothness
**Priority:** P3
**Steps:**
1. Enable Chrome DevTools Performance monitoring
2. Collapse and expand panels multiple times
3. Monitor for janky animations or frame drops
4. Check CPU/GPU usage

**Expected Results:**
- Smooth 60fps animations
- No visual stuttering
- Transitions complete in 250ms

**Acceptance Criteria:**
- [ ] Animation at 60fps
- [ ] No performance issues
- [ ] Smooth visual experience

### TC-009: Cross-Browser Compatibility
**Priority:** P1
**Steps:**
1. Test TC-001 through TC-004 on each browser:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)

**Expected Results:**
- Consistent behavior across all browsers
- CSS Grid support working correctly
- No browser-specific alignment issues

**Acceptance Criteria:**
- [ ] Chrome: All tests pass
- [ ] Firefox: All tests pass
- [ ] Safari: All tests pass
- [ ] Edge: All tests pass

### TC-010: Dynamic Content Height Changes
**Priority:** P3
**Steps:**
1. Start simulation with small lattice (N=8)
2. Note button positions
3. Change to large lattice (N=32)
4. Verify button positions remain aligned
5. Add/remove statistics display items

**Expected Results:**
- Buttons maintain 50% vertical centering
- Grid columns maintain equal height
- No layout shifts with content changes

**Acceptance Criteria:**
- [ ] Alignment stable with content changes
- [ ] Grid layout adapts properly
- [ ] No visual glitches

## Regression Tests

### RT-001: Verify Existing Functionality Not Broken
- [ ] Panels collapse and expand correctly
- [ ] Panel content hides/shows appropriately
- [ ] Controls remain functional
- [ ] Visualization renders correctly
- [ ] Statistics update properly
- [ ] Save/Load functionality works

## Performance Metrics
- Animation frame rate: ≥60fps
- Collapse/expand transition time: 250ms
- No memory leaks after 100 collapse/expand cycles
- CPU usage during animation: <50%

## Accessibility Checks
- [ ] Buttons keyboard accessible (Tab navigation)
- [ ] ARIA labels present and correct
- [ ] Focus indicators visible
- [ ] Screen reader announces state changes
- [ ] Contrast ratio meets WCAG 2.1 AA (4.5:1)

## Test Data Recording

| Test Case | Browser | Viewport | Result | Notes |
|-----------|---------|----------|--------|-------|
| TC-001 | - | - | - | - |
| TC-002 | - | - | - | - |
| TC-003 | - | - | - | - |
| TC-004 | - | - | - | - |
| TC-005 | - | - | - | - |
| TC-006 | - | - | - | - |
| TC-007 | - | - | - | - |
| TC-008 | - | - | - | - |
| TC-009 | - | - | - | - |
| TC-010 | - | - | - | - |

## Defects Found
_(To be filled during testing)_

## Test Summary
- **Total Test Cases:** 10
- **Passed:** _TBD_
- **Failed:** _TBD_
- **Blocked:** _TBD_
- **Pass Rate:** _TBD_

## Sign-off
- [ ] All P1 test cases pass
- [ ] No SEV1/SEV2 defects remain open
- [ ] Performance metrics meet requirements
- [ ] Accessibility requirements satisfied
- [ ] Cross-browser compatibility verified

---
**Test Execution Date:** _TBD_
**Tested By:** _TBD_
**Approved By:** _TBD_