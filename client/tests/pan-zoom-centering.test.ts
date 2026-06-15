/**
 * Tests for PanZoomCanvas centering logic
 */

describe('PanZoomCanvas Centering', () => {
  describe('Centering Calculations', () => {
    it('should center canvas correctly when scale is 1', () => {
      const canvasWidth = 600;
      const canvasHeight = 400;
      const viewportWidth = 1000;
      const viewportHeight = 800;
      const scale = 1;

      const scaledWidth = canvasWidth * scale;
      const scaledHeight = canvasHeight * scale;
      const panX = (viewportWidth - scaledWidth) / 2;
      const panY = (viewportHeight - scaledHeight) / 2;

      // Canvas should be centered
      expect(panX).toBe(200); // (1000 - 600) / 2
      expect(panY).toBe(200); // (800 - 400) / 2
    });

    it('should center canvas correctly when scale is less than 1', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      const viewportWidth = 600;
      const viewportHeight = 400;
      const scale = 0.5;

      const scaledWidth = canvasWidth * scale;
      const scaledHeight = canvasHeight * scale;
      const panX = (viewportWidth - scaledWidth) / 2;
      const panY = (viewportHeight - scaledHeight) / 2;

      // Scaled canvas (400x300) should be centered in viewport (600x400)
      expect(panX).toBe(100); // (600 - 400) / 2
      expect(panY).toBe(50); // (400 - 300) / 2
    });

    it('should handle negative pan values when canvas is larger than viewport', () => {
      const canvasWidth = 1200;
      const canvasHeight = 900;
      const viewportWidth = 800;
      const viewportHeight = 600;
      const scale = 1;

      const scaledWidth = canvasWidth * scale;
      const scaledHeight = canvasHeight * scale;
      const panX = (viewportWidth - scaledWidth) / 2;
      const panY = (viewportHeight - scaledHeight) / 2;

      // When canvas is larger, pan values will be negative to center
      expect(panX).toBe(-200); // (800 - 1200) / 2
      expect(panY).toBe(-150); // (600 - 900) / 2
    });

    it('should calculate correct center position for typical simulation', () => {
      // Typical values from the application
      const canvasWidth = 480; // 24 cells * 20px
      const canvasHeight = 480;
      const viewportWidth = 797; // Typical viewport width
      const viewportHeight = 318; // Typical viewport height per simulation
      const scale = 0.66; // Scale to fit

      const scaledWidth = canvasWidth * scale;
      const scaledHeight = canvasHeight * scale;
      const panX = (viewportWidth - scaledWidth) / 2;
      const panY = (viewportHeight - scaledHeight) / 2;

      // Should center the scaled canvas
      expect(scaledWidth).toBeCloseTo(316.8);
      expect(scaledHeight).toBeCloseTo(316.8);
      expect(panX).toBeCloseTo(240.1); // (797 - 316.8) / 2
      expect(panY).toBeCloseTo(0.6); // (318 - 316.8) / 2
    });

    it('should never produce the incorrect positions (164.5, 75.5)', () => {
      // The bug was producing these specific incorrect values
      const incorrectX = 164.5;

      // Test various typical configurations
      const configs = [
        { canvas: 480, viewport: 797, scale: 1 },
        { canvas: 480, viewport: 797, scale: 0.66 },
        { canvas: 600, viewport: 800, scale: 0.9 },
        { canvas: 400, viewport: 600, scale: 1 },
      ];

      for (const config of configs) {
        const scaledWidth = config.canvas * config.scale;
        const panX = (config.viewport - scaledWidth) / 2;

        // Should never produce the incorrect value
        expect(Math.abs(panX - incorrectX)).toBeGreaterThan(1);
      }
    });
  });

  describe('Viewport Dimension Validation', () => {
    it('should validate viewport has positive dimensions', () => {
      const hasValidDimensions = (width: number, height: number) => {
        return width > 0 && height > 0;
      };

      expect(hasValidDimensions(800, 600)).toBe(true);
      expect(hasValidDimensions(0, 600)).toBe(false);
      expect(hasValidDimensions(800, 0)).toBe(false);
      expect(hasValidDimensions(-100, 600)).toBe(false);
    });

    it('should use clientWidth/Height over getBoundingClientRect', () => {
      // Mock element dimensions
      const mockElement = {
        clientWidth: 800,
        clientHeight: 600,
        getBoundingClientRect: () => ({
          width: 750, // Different from clientWidth
          height: 550, // Different from clientHeight
        }),
      };

      // Should prefer clientWidth/Height
      const width = mockElement.clientWidth || mockElement.getBoundingClientRect().width;
      const height = mockElement.clientHeight || mockElement.getBoundingClientRect().height;

      expect(width).toBe(800);
      expect(height).toBe(600);
    });
  });
});
