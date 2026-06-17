/**
 * N-sim diff/overlay view (issue #60).
 *
 * Picks two simulation instances and paints a per-cell difference map: cells
 * whose vertex type differs between A and B are highlighted, matching cells are
 * faint. Reports how many cells differ. Same-size lattices only (all N-sim
 * instances share the global size, so that always holds here).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationController } from '../lib/six-vertex/types';
import { extractTypeGrid, diffTypeGrids, type GridDiff } from '../lib/six-vertex/nSimDiff';
import { getThemeColors } from '../lib/six-vertex/themeColors';
import styles from './NSimDiffView.module.css';

interface NSimDiffViewProps {
  controllers: SimulationController[];
  labels: string[];
  isDark: boolean;
}

const CANVAS_PX = 320;
const POLL_MS = 250;

export const NSimDiffView: React.FC<NSimDiffViewProps> = ({ controllers, labels, isDark }) => {
  const [aIndex, setAIndex] = useState(0);
  const [bIndex, setBIndex] = useState(1);
  const [summary, setSummary] = useState<GridDiff | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  // Keep the selected indices valid as instances are added/removed.
  const a = Math.min(aIndex, controllers.length - 1);
  const b = Math.min(bIndex, controllers.length - 1);

  useEffect(() => {
    const ctrlA = controllers[a];
    const ctrlB = controllers[b];
    if (!ctrlA || !ctrlB) return;

    const paint = () => {
      const gridA = extractTypeGrid(ctrlA);
      const gridB = extractTypeGrid(ctrlB);
      const d = diffTypeGrids(gridA, gridB);
      setSummary(d);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!d) return;

      const cell = CANVAS_PX / d.width;
      const size = Math.max(1, Math.ceil(cell));
      // Matching cells: faint grid tint. Differing: accent.
      for (let row = 0; row < d.height; row++) {
        for (let col = 0; col < d.width; col++) {
          const differs = d.diff[row * d.width + col] === 1;
          ctx.fillStyle = differs ? colors.vertexTypes.c2 : colors.grid;
          if (differs || size >= 3) {
            ctx.fillRect(col * cell, row * cell, size, differs ? size : Math.max(1, size - 1));
          }
        }
      }
    };

    paint();
    const id = setInterval(paint, POLL_MS);
    return () => clearInterval(id);
  }, [controllers, a, b, colors]);

  if (controllers.length < 2) return null;

  const matchPct = summary ? ((1 - summary.fraction) * 100).toFixed(1) : '—';

  return (
    <div className={styles.diffView}>
      <h3 className={styles.title}>Diff view</h3>
      <div className={styles.pickers}>
        <label>
          A
          <select value={a} onChange={(e) => setAIndex(Number(e.target.value))}>
            {controllers.map((_, i) => (
              <option key={i} value={i}>
                {labels[i] ?? `Sim ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.vs}>vs</span>
        <label>
          B
          <select value={b} onChange={(e) => setBIndex(Number(e.target.value))}>
            {controllers.map((_, i) => (
              <option key={i} value={i}>
                {labels[i] ?? `Sim ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_PX}
        height={CANVAS_PX}
        className={styles.canvas}
        aria-label="Per-cell difference map between the two selected simulations"
      />

      <div className={styles.summary}>
        {summary ? (
          <>
            <strong>{summary.differing.toLocaleString()}</strong> of{' '}
            {summary.total.toLocaleString()} cells differ ({matchPct}% match)
          </>
        ) : (
          'Waiting for comparable states…'
        )}
      </div>
    </div>
  );
};

export default NSimDiffView;
