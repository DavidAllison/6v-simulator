import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { LatticeState } from '../lib/six-vertex/types';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from '../lib/six-vertex/types';
import { PanZoomCanvas } from './PanZoomCanvas';
import './DualSimulationDisplay.css';

interface DualSimulationDisplayProps {
  latticeA: LatticeState | null;
  latticeB: LatticeState | null;
  showArrows: boolean;
  cellSize: number;
}

export function DualSimulationDisplay({
  latticeA,
  latticeB,
  showArrows,
  cellSize: baseCellSize,
}: DualSimulationDisplayProps) {
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({
    canvasWidth: 800,
    canvasHeight: 800,
    cellSize: baseCellSize,
  });

  // Calculate optimal dimensions to fill available space
  const updateDimensions = useCallback(() => {
    if (!containerRef.current || !latticeA) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Validate container dimensions are reasonable
    if (containerRect.width < 100 || containerRect.height < 100) {
      console.log('Container dimensions too small, skipping update');
      return;
    }

    // Get the actual computed styles to account for padding
    const containerStyles = window.getComputedStyle(container);
    const containerPaddingH =
      parseFloat(containerStyles.paddingLeft) + parseFloat(containerStyles.paddingRight);
    const containerPaddingV =
      parseFloat(containerStyles.paddingTop) + parseFloat(containerStyles.paddingBottom);

    // Calculate available space accounting for container padding and gap
    const gap = 8; // Gap between simulations (from CSS: 0.5rem)
    const availableWidth = containerRect.width - containerPaddingH;
    const availableHeight = containerRect.height - containerPaddingV;

    // Calculate expected height per simulation
    let effectiveHeightPerSimulation = (availableHeight - gap) / 2;

    // Try to get actual viewport dimensions if PanZoomCanvas is rendered
    const panZoomContainers = container.querySelectorAll('.pan-zoom-container');
    if (panZoomContainers.length === 2) {
      const firstContainer = panZoomContainers[0];
      const viewport = firstContainer.querySelector('.pan-zoom-viewport');
      if (viewport) {
        const viewportRect = viewport.getBoundingClientRect();
        // Only use viewport height if it's reasonable (less than container height)
        if (viewportRect.height > 0 && viewportRect.height < containerRect.height) {
          effectiveHeightPerSimulation = viewportRect.height;
        } else {
          // Fallback: estimate based on container structure
          // Each PanZoomCanvas gets half height minus gap
          // Viewport is container minus label (40px)
          effectiveHeightPerSimulation = (availableHeight - gap) / 2 - 40;
        }
      }
    }

    // Calculate the optimal cell size to fill available space
    // Use conservative sizing to ensure the canvas fits within PanZoomCanvas viewport
    const paddingFactor = 0.7; // Conservative padding to ensure proper fit
    const maxCellSizeByWidth = (availableWidth * paddingFactor) / latticeA.width;
    const maxCellSizeByHeight = (effectiveHeightPerSimulation * paddingFactor) / latticeA.height;

    // Choose the limiting dimension
    const optimalCellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight);

    // Set minimum and maximum cell sizes
    const MIN_CELL_SIZE = 15; // Lower minimum to allow better fitting
    const MAX_CELL_SIZE = 80; // Lower maximum to prevent overflow

    // Clamp the cell size within reasonable bounds
    const finalCellSize = Math.floor(
      Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, optimalCellSize)),
    );

    // Calculate actual canvas dimensions
    const canvasWidth = Math.floor(latticeA.width * finalCellSize);
    const canvasHeight = Math.floor(latticeA.height * finalCellSize);

    console.log('=== DualSimulationDisplay Sizing Debug ===');
    console.log('Container rect:', containerRect.width, 'x', containerRect.height);
    console.log('Container padding H/V:', containerPaddingH, containerPaddingV);
    console.log('Available space:', availableWidth, 'x', availableHeight);
    console.log('Effective height per simulation:', effectiveHeightPerSimulation.toFixed(1));
    console.log('Lattice size:', latticeA.width, 'x', latticeA.height);
    console.log('Max cell size by width:', maxCellSizeByWidth.toFixed(2));
    console.log('Max cell size by height:', maxCellSizeByHeight.toFixed(2));
    console.log('Optimal cell size:', optimalCellSize.toFixed(2));
    console.log('Final cell size (clamped):', finalCellSize);
    console.log('Canvas dimensions:', canvasWidth, 'x', canvasHeight);
    console.log(
      'Expected scale in PanZoomCanvas:',
      Math.min(availableWidth / canvasWidth, effectiveHeightPerSimulation / canvasHeight).toFixed(
        2,
      ),
    );
    console.log('=========================================');

    setDimensions({
      canvasWidth,
      canvasHeight,
      cellSize: finalCellSize,
    });
  }, [latticeA]);

  // Setup resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      // Only update if the container has meaningful dimensions
      for (const entry of entries) {
        if (entry.contentRect.width > 100 && entry.contentRect.height > 100) {
          updateDimensions();
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    // Multiple update attempts to ensure we get the correct viewport dimensions
    // First update: immediate
    updateDimensions();

    // Second update: after a small delay for DOM to settle
    const timeoutId1 = setTimeout(() => {
      updateDimensions();
    }, 50);

    // Third update: after PanZoomCanvas should be fully rendered
    const timeoutId2 = setTimeout(() => {
      updateDimensions();
    }, 200);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      resizeObserver.disconnect();
    };
  }, [updateDimensions]);

  // Render simulation A
  useEffect(() => {
    if (!latticeA || !canvasARef.current) return;

    const renderer = new PathRenderer(canvasARef.current, {
      cellSize: dimensions.cellSize,
      mode: showArrows ? RenderMode.Arrows : RenderMode.Paths,
    });
    renderer.render(latticeA);
  }, [latticeA, showArrows, dimensions.cellSize]);

  // Render simulation B
  useEffect(() => {
    if (!latticeB || !canvasBRef.current) return;

    const renderer = new PathRenderer(canvasBRef.current, {
      cellSize: dimensions.cellSize,
      mode: showArrows ? RenderMode.Arrows : RenderMode.Paths,
    });
    renderer.render(latticeB);
  }, [latticeB, showArrows, dimensions.cellSize]);

  if (!latticeA || !latticeB) {
    return (
      <div className="dual-simulation-display">
        <div className="loading-message">Initializing simulations...</div>
      </div>
    );
  }

  return (
    <div className="dual-simulation-display" ref={containerRef}>
      {/* Simulation A */}
      <PanZoomCanvas
        width={dimensions.canvasWidth}
        height={dimensions.canvasHeight}
        label="Simulation A"
        minZoom={0.3}
        maxZoom={5}
        fitMode="fill"
      >
        <canvas
          ref={canvasARef}
          width={dimensions.canvasWidth}
          height={dimensions.canvasHeight}
          className="simulation-canvas"
        />
      </PanZoomCanvas>

      {/* Simulation B */}
      <PanZoomCanvas
        width={dimensions.canvasWidth}
        height={dimensions.canvasHeight}
        label="Simulation B"
        minZoom={0.3}
        maxZoom={5}
        fitMode="fill"
      >
        <canvas
          ref={canvasBRef}
          width={dimensions.canvasWidth}
          height={dimensions.canvasHeight}
          className="simulation-canvas"
        />
      </PanZoomCanvas>
    </div>
  );
}
