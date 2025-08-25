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

    // Account for PanZoomCanvas internal elements (controls, label)
    // Label height: 2.5rem (~40px), Controls padding: ~20px
    const panZoomOverhead = 60;
    const effectiveHeightPerSimulation = heightPerSimulation - panZoomOverhead;

    // Calculate the optimal cell size to fill available space
    // Add small padding (5%) to prevent edge clipping
    const paddingFactor = 0.95;
    const maxCellSizeByWidth = (availableWidth * paddingFactor) / latticeA.width;
    const maxCellSizeByHeight = (effectiveHeightPerSimulation * paddingFactor) / latticeA.height;
    const optimalCellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight);

    // Set minimum and maximum cell sizes for quality
    const MIN_CELL_SIZE = 20; // Minimum for visibility
    const MAX_CELL_SIZE = 100; // Maximum for performance

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
    console.log('Per simulation (raw):', availableWidth, 'x', heightPerSimulation);
    console.log('Per simulation (effective):', availableWidth, 'x', effectiveHeightPerSimulation);
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
