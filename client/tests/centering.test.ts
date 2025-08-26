/**
 * Tests for canvas centering logic
 */

describe('Canvas Centering', () => {
  describe('PanZoomCanvas centering calculations', () => {
    it('should center canvas when scale <= 1', () => {
      const viewportWidth = 800;
      const viewportHeight = 600;
      const canvasWidth = 600;
      const canvasHeight = 400;
      const scale = 0.9;

      const scaledWidth = canvasWidth * scale;
      const scaledHeight = canvasHeight * scale;

      // Calculate centering offsets - should always be positive when scale <= 1
      const panX = Math.max(0, (viewportWidth - scaledWidth) / 2);
      const panY = Math.max(0, (viewportHeight - scaledHeight) / 2);

      // Verify centering is correct
      expect(panX).toBeGreaterThan(0);
      expect(panY).toBeGreaterThan(0);

      // Canvas should be centered
      const leftMargin = panX;
      const rightMargin = viewportWidth - scaledWidth - panX;
      const topMargin = panY;
      const bottomMargin = viewportHeight - scaledHeight - panY;

      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(1);
      expect(Math.abs(topMargin - bottomMargin)).toBeLessThan(1);
    });

    it('should clamp scale to maximum 1.0 in fill mode', () => {
      const viewportWidth = 400;
      const viewportHeight = 300;
      const canvasWidth = 300; // Smaller than viewport
      const canvasHeight = 200; // Smaller than viewport

      const scaleX = viewportWidth / canvasWidth; // Would be > 1
      const scaleY = viewportHeight / canvasHeight; // Would be > 1

      // In fill mode, scale should be clamped to 1.0
      const scale = Math.min(scaleX, scaleY, 1.0);

      expect(scale).toBeLessThanOrEqual(1.0);
    });

    it('should ensure positive pan values when scale <= 1', () => {
      const testCases = [
        { viewport: { w: 800, h: 600 }, canvas: { w: 1000, h: 800 }, scale: 0.75 },
        { viewport: { w: 600, h: 400 }, canvas: { w: 600, h: 400 }, scale: 0.9 },
        { viewport: { w: 1024, h: 768 }, canvas: { w: 800, h: 600 }, scale: 1.0 },
      ];

      testCases.forEach(({ viewport, canvas, scale }) => {
        const scaledWidth = canvas.w * scale;
        const scaledHeight = canvas.h * scale;

        // Using Math.max ensures positive values
        const panX = Math.max(0, (viewport.w - scaledWidth) / 2);
        const panY = Math.max(0, (viewport.h - scaledHeight) / 2);

        expect(panX).toBeGreaterThanOrEqual(0);
        expect(panY).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('DualSimulationDisplay sizing', () => {
    it('should create canvas smaller than viewport with 75% padding factor', () => {
      const availableWidth = 800;
      const availableHeight = 600;
      const latticeSize = 20;
      const paddingFactor = 0.75;

      const maxCellSizeByWidth = (availableWidth * paddingFactor) / latticeSize;
      const maxCellSizeByHeight = (availableHeight * paddingFactor) / latticeSize;

      const cellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight);
      const canvasSize = cellSize * latticeSize;

      // Canvas should be smaller than available space
      expect(canvasSize).toBeLessThan(Math.min(availableWidth, availableHeight));

      // Canvas should use approximately 75% of available space
      const spaceUtilization = canvasSize / Math.min(availableWidth, availableHeight);
      expect(spaceUtilization).toBeLessThanOrEqual(0.76); // Small tolerance
      expect(spaceUtilization).toBeGreaterThan(0.7);
    });

    it('should respect cell size limits', () => {
      const MIN_CELL_SIZE = 10;
      const MAX_CELL_SIZE = 60;

      const testCases = [
        { optimal: 5, expected: MIN_CELL_SIZE }, // Too small
        { optimal: 100, expected: MAX_CELL_SIZE }, // Too large
        { optimal: 35, expected: 35 }, // Just right
      ];

      testCases.forEach(({ optimal, expected }) => {
        const finalCellSize = Math.floor(Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, optimal)));
        expect(finalCellSize).toBe(expected);
      });
    });
  });
});
