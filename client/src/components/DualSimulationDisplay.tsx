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

    // Get the actual computed styles to account for padding
    const containerStyles = window.getComputedStyle(container);
    const containerPaddingH =
      parseFloat(containerStyles.paddingLeft) + parseFloat(containerStyles.paddingRight);
    const containerPaddingV =
      parseFloat(containerStyles.paddingTop) + parseFloat(containerStyles.paddingBottom);

    // Calculate available space accounting for container padding and gap
    const gap = 8; // Gap between simulations (from CSS: 0.5rem)
    const availableWidth = containerRect.width - containerPaddingH;
    const availableHeight = containerRect.height - containerPaddingV - gap;

    // Each simulation gets approximately half the height
    const heightPerSimulation = availableHeight / 2;

    // For square lattices, we want to maximize the display size while fitting
    // Since the lattice is square, we need to find the limiting dimension
    const maxCellSizeByWidth = availableWidth / latticeA.width;
    const maxCellSizeByHeight = heightPerSimulation / latticeA.height;

    // Use the width-based cell size for better horizontal fill
    // Since we're aligning top-center, width is more important
    const optimalCellSize = maxCellSizeByWidth;

    // Set a reasonable range for cell size
    const finalCellSize = Math.max(30, Math.min(optimalCellSize, 120));

    // Calculate actual canvas dimensions
    const canvasWidth = Math.floor(latticeA.width * finalCellSize);
    const canvasHeight = Math.floor(latticeA.height * finalCellSize);

    console.log('Container:', containerRect.width, 'x', containerRect.height);
    console.log('Available space:', availableWidth, 'x', availableHeight);
    console.log('Per simulation:', availableWidth, 'x', heightPerSimulation);
    console.log('Cell size options - width:', maxCellSizeByWidth, 'height:', maxCellSizeByHeight);
    console.log('Optimal cell size:', optimalCellSize, '→ Final:', finalCellSize);
    console.log('Canvas dimensions:', canvasWidth, 'x', canvasHeight);

    setDimensions({
      canvasWidth,
      canvasHeight,
      cellSize: finalCellSize,
    });
  }, [latticeA]);

  // Setup resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);

    // Initial calculation with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updateDimensions();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
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
