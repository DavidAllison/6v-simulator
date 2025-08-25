// Test for dual display sizing logic

describe('DualSimulationDisplay Sizing Logic', () => {
  // Simulate the dimension calculation logic from DualSimulationDisplay
  function calculateDimensions(
    containerWidth: number,
    containerHeight: number,
    latticeSize: number,
    containerPadding = 16, // 0.5rem * 2
    gap = 8, // 0.5rem
  ) {
    // Available space accounting for padding and gap
    const availableWidth = containerWidth - containerPadding;
    const availableHeight = containerHeight - containerPadding - gap;

    // Each simulation gets half the height
    const heightPerSimulation = availableHeight / 2;

    // Calculate max cell sizes
    const maxCellSizeByWidth = availableWidth / latticeSize;
    const maxCellSizeByHeight = heightPerSimulation / latticeSize;

    // Use minimum to ensure fit, then scale up for better resolution
    const optimalCellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight) * 2;

    // Apply reasonable bounds
    const finalCellSize = Math.max(20, Math.min(optimalCellSize, 150));

    // Calculate canvas dimensions
    const canvasWidth = Math.floor(latticeSize * finalCellSize);
    const canvasHeight = Math.floor(latticeSize * finalCellSize);

    return {
      availableWidth,
      availableHeight,
      heightPerSimulation,
      maxCellSizeByWidth,
      maxCellSizeByHeight,
      optimalCellSize,
      finalCellSize,
      canvasWidth,
      canvasHeight,
    };
  }

  // Simulate PanZoomCanvas fitToScreen logic
  function calculateFitToScreen(
    canvasWidth: number,
    canvasHeight: number,
    viewportWidth: number,
    viewportHeight: number,
  ) {
    const padding = 20;
    const availableWidth = viewportWidth - padding * 2;
    const availableHeight = viewportHeight - padding * 2;

    const scaleX = availableWidth / canvasWidth;
    const scaleY = availableHeight / canvasHeight;

    const scale = Math.min(scaleX, scaleY) * 0.95;

    const scaledWidth = canvasWidth * scale;
    const scaledHeight = canvasHeight * scale;
    const panX = (viewportWidth - scaledWidth) / 2;
    const panY = (viewportHeight - scaledHeight) / 2;

    return {
      scale,
      scaledWidth,
      scaledHeight,
      panX,
      panY,
      percentageUsed: scale * 100,
    };
  }

  it('should calculate correct dimensions for typical desktop screen', () => {
    // Typical center area: 788x1184 (from console logs)
    const result = calculateDimensions(788, 1184, 10);

    expect(result.availableWidth).toBe(772);
    expect(result.availableHeight).toBe(1160);
    expect(result.heightPerSimulation).toBe(580);

    // Should use height as limiting factor for square lattice
    expect(result.maxCellSizeByHeight).toBeLessThan(result.maxCellSizeByWidth);
    expect(result.finalCellSize).toBeGreaterThan(50); // Should be reasonably large

    // Canvas should be square for square lattice
    expect(result.canvasWidth).toBe(result.canvasHeight);
  });

  it('should handle small container sizes', () => {
    const result = calculateDimensions(400, 600, 10);

    expect(result.finalCellSize).toBeGreaterThanOrEqual(20); // Minimum size
    expect(result.canvasWidth).toBeLessThanOrEqual(400 * 2); // Shouldn't be huge
  });

  it('should handle large lattice sizes', () => {
    const result = calculateDimensions(788, 1184, 50);

    // Should still produce reasonable cell sizes
    expect(result.finalCellSize).toBeGreaterThan(15);
    expect(result.finalCellSize).toBeLessThan(40);
  });

  it('should scale canvas to fit viewport properly', () => {
    // Canvas of 1000x1000 in viewport of 772x580
    const result = calculateFitToScreen(1000, 1000, 772, 580);

    // Should scale based on height (smaller dimension)
    expect(result.scale).toBeLessThan(0.6); // Should fit with padding
    expect(result.percentageUsed).toBeGreaterThan(50); // Should use most of space
    expect(result.percentageUsed).toBeLessThan(60); // But not overflow

    // Should be centered
    expect(result.panX).toBeGreaterThan(0);
    expect(result.panY).toBeGreaterThan(0);
  });

  it('should produce consistent scaling for both simulations', () => {
    const containerWidth = 788;
    const containerHeight = 1184;
    const latticeSize = 10;

    const dims = calculateDimensions(containerWidth, containerHeight, latticeSize);

    // Both simulations should have same viewport size
    const viewportHeight = dims.heightPerSimulation;

    const fitA = calculateFitToScreen(
      dims.canvasWidth,
      dims.canvasHeight,
      dims.availableWidth,
      viewportHeight,
    );

    const fitB = calculateFitToScreen(
      dims.canvasWidth,
      dims.canvasHeight,
      dims.availableWidth,
      viewportHeight,
    );

    // Both should have identical scaling
    expect(fitA.scale).toBe(fitB.scale);
    expect(fitA.percentageUsed).toBe(fitB.percentageUsed);
  });

  it('should use more than 80% of available space', () => {
    const testCases = [
      { container: [788, 1184], lattice: 10 },
      { container: [1200, 800], lattice: 10 },
      { container: [600, 1000], lattice: 20 },
    ];

    testCases.forEach(({ container, lattice }) => {
      const dims = calculateDimensions(container[0], container[1], lattice);
      const fit = calculateFitToScreen(
        dims.canvasWidth,
        dims.canvasHeight,
        dims.availableWidth,
        dims.heightPerSimulation,
      );

      // The displayed size should be reasonable
      const displayedSize = Math.min(fit.scaledWidth, fit.scaledHeight);
      const availableSize = Math.min(dims.availableWidth, dims.heightPerSimulation);
      const utilization = displayedSize / availableSize;

      expect(utilization).toBeGreaterThan(0.8);
      expect(utilization).toBeLessThanOrEqual(1.0);
    });
  });
});
