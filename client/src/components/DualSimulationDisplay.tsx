import { useRef, useEffect } from 'react';
import type { LatticeState } from '../lib/six-vertex/types';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from '../lib/six-vertex/types';
import { PanZoomCanvas } from './PanZoomCanvas';
import './DualSimulationDisplay.css';

interface DualSimulationDisplayProps {
  latticeA: LatticeState | null;
  latticeB: LatticeState | null;
  showArrows: boolean;
  /** Per-cell pixel size used for the natural (unscaled) canvas resolution. */
  cellSize: number;
}

/** Floor on render resolution so small lattices still look crisp when zoomed. */
const MIN_NATURAL_CELL = 16;

export function DualSimulationDisplay({
  latticeA,
  latticeB,
  showArrows,
  cellSize: baseCellSize,
}: DualSimulationDisplayProps) {
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);

  // Render each lattice once at a fixed natural resolution; PanZoomCanvas owns
  // fit-to-screen and any subsequent pan/zoom via a CSS transform.
  const naturalCell = Math.max(baseCellSize, MIN_NATURAL_CELL);

  useEffect(() => {
    if (!latticeA || !canvasARef.current) return;
    const renderer = new PathRenderer(canvasARef.current, {
      cellSize: naturalCell,
      mode: showArrows ? RenderMode.Arrows : RenderMode.Paths,
    });
    renderer.render(latticeA);
  }, [latticeA, showArrows, naturalCell]);

  useEffect(() => {
    if (!latticeB || !canvasBRef.current) return;
    const renderer = new PathRenderer(canvasBRef.current, {
      cellSize: naturalCell,
      mode: showArrows ? RenderMode.Arrows : RenderMode.Paths,
    });
    renderer.render(latticeB);
  }, [latticeB, showArrows, naturalCell]);

  if (!latticeA || !latticeB) {
    return (
      <div className="dual-simulation-display">
        <div className="loading-message">Initializing simulations...</div>
      </div>
    );
  }

  // PathRenderer sizes its backing store to (N + 1) * cellSize (a half-cell
  // margin around the lattice), so the wrapper must use the same dimensions for
  // its fit/center math and not re-impose a different CSS size on the canvas.
  const widthA = (latticeA.width + 1) * naturalCell;
  const heightA = (latticeA.height + 1) * naturalCell;
  const widthB = (latticeB.width + 1) * naturalCell;
  const heightB = (latticeB.height + 1) * naturalCell;

  return (
    <div className="dual-simulation-display">
      <div className="simulation-container">
        <div className="simulation-label">Simulation A</div>
        <div className="simulation-content">
          <PanZoomCanvas width={widthA} height={heightA} fitMode="contain">
            <canvas ref={canvasARef} className="simulation-canvas" />
          </PanZoomCanvas>
        </div>
      </div>

      <div className="simulation-container">
        <div className="simulation-label">Simulation B</div>
        <div className="simulation-content">
          <PanZoomCanvas width={widthB} height={heightB} fitMode="contain">
            <canvas ref={canvasBRef} className="simulation-canvas" />
          </PanZoomCanvas>
        </div>
      </div>
    </div>
  );
}
