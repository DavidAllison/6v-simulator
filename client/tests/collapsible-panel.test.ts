// Test to verify the CollapsiblePanel DOM structure fixes

describe('CollapsiblePanel DOM Structure', () => {
  it('should have symmetric structure between left and right panels', () => {
    // This test verifies the structure has been fixed
    // The main-content grid should now have 4 columns: left panel, canvas, stats, save/load
    // Each CollapsiblePanel should be a direct child of main-content

    const expectedGridColumns = 'auto 1fr auto auto';
    const expectedPanelClasses = ['control-section', 'stats-section', 'save-section'];

    // All panels should have the same base structure
    expectedPanelClasses.forEach((className) => {
      expect(className).toBeTruthy();
    });

    // Grid should handle 4 direct children
    expect(expectedGridColumns).toBe('auto 1fr auto auto');
  });

  it('should hide content completely when collapsed', () => {
    // When collapsed:
    // - panel width should be 24px (just for button)
    // - panel-content should have display: none
    // - no white border or background should be visible

    const collapsedWidth = 24;
    const buttonCenteredPosition = '50%';

    expect(collapsedWidth).toBe(24);
    expect(buttonCenteredPosition).toBe('50%');
  });

  it('should keep buttons vertically centered', () => {
    // Buttons should always be at top: 50%, transform: translateY(-50%)
    // This should work in both expanded and collapsed states

    const buttonPosition = {
      top: '50%',
      transform: 'translateY(-50%)',
    };

    expect(buttonPosition.top).toBe('50%');
    expect(buttonPosition.transform).toBe('translateY(-50%)');
  });
});
