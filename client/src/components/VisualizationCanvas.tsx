import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { LatticeState, RenderConfig } from '../lib/six-vertex/types';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import './VisualizationCanvas.css';

interface VisualizationCanvasProps {
  renderer: PathRenderer | null;
  latticeState: LatticeState | null;
  onRendererReady: (renderer: PathRenderer) => void;
  renderConfig: Partial<RenderConfig>;
}

const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({
  renderer,
  latticeState,
  onRendererReady,
  renderConfig,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredVertex, setHoveredVertex] = useState<{ row: number; col: number } | null>(null);

  // Initialize renderer when canvas or config changes significantly
  useEffect(() => {
    if (!canvasRef.current) return;

    const newRenderer = new PathRenderer(canvasRef.current, renderConfig);
    onRendererReady(newRenderer);

    return () => {
      // Cleanup if needed
    };
  }, [renderConfig.cellSize]); // Re-create renderer when cell size changes

  // Update renderer config
  useEffect(() => {
    if (renderer) {
      renderer.updateConfig(renderConfig);
      if (latticeState) {
        renderer.render(latticeState);
      }
    }
  }, [renderer, renderConfig, latticeState]);

  // Handle zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prevZoom) => Math.min(Math.max(prevZoom * delta, 0.25), 4));
  }, []);

  // Handle pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        // Left click
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      } else if (canvasRef.current && latticeState) {
        // Calculate hovered vertex
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;

        const cellSize = renderConfig.cellSize || 30;
        const col = Math.floor(x / cellSize) - 1;
        const row = Math.floor(y / cellSize) - 1;

        if (col >= 0 && col < latticeState.width && row >= 0 && row < latticeState.height) {
          setHoveredVertex({ row, col });
        } else {
          setHoveredVertex(null);
        }
      }
    },
    [isDragging, dragStart, pan, zoom, latticeState, renderConfig.cellSize],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredVertex(null);
  }, []);

  // Reset view
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Fit to screen
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !canvasRef.current || !latticeState) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const cellSize = renderConfig.cellSize || 30;
    const canvasWidth = (latticeState.width + 1) * cellSize;
    const canvasHeight = (latticeState.height + 1) * cellSize;

    const scaleX = (containerRect.width - 100) / canvasWidth;
    const scaleY = (containerRect.height - 100) / canvasHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);

    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }, [latticeState, renderConfig.cellSize]);

  // Add wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  return (
    <div className="visualization-container" ref={containerRef}>
      <div className="canvas-wrapper">
        <div
          className="canvas-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <canvas
            ref={canvasRef}
            className="simulation-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
        </div>

        {hoveredVertex && latticeState && (
          <div className="vertex-tooltip">
            <div className="tooltip-header">
              Vertex ({hoveredVertex.row}, {hoveredVertex.col})
            </div>
            <div className="tooltip-content">
              <span>Type: </span>
              <strong>{latticeState.vertices[hoveredVertex.row][hoveredVertex.col].type}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="canvas-controls">
        <button
          className="zoom-button"
          onClick={() => setZoom((z) => Math.min(z * 1.2, 4))}
          title="Zoom In"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
            />
          </svg>
        </button>

        <button
          className="zoom-button"
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.25))}
          title="Zoom Out"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
            />
          </svg>
        </button>

        <button className="zoom-button" onClick={handleResetView} title="Reset View">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>

        <button className="zoom-button" onClick={handleFitToScreen} title="Fit to Screen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>

        <div className="zoom-indicator">{(zoom * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
};

export default VisualizationCanvas;
