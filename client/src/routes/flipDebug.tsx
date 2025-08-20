/**
 * Flip Debug Page - Step through individual flips to debug ice rule violations
 * Allows detailed inspection of 2x2 flip transformations
 */

import { useState, useEffect, useCallback } from 'react';
import { VertexType, getVertexConfiguration } from '../lib/six-vertex/types';
import { FlipDirection } from '../lib/six-vertex/physicsFlips';
import {
  OptimizedPhysicsSimulation,
  generateDWBCHighOptimized,
} from '../lib/six-vertex/optimizedSimulation';
import {
  VertexEdgeVisualization,
  VertexLegend,
  PlaquetteVisualization,
} from '../components/VertexEdgeVisualization';
import { validateLatticeIntegrity } from '../lib/six-vertex/correctedFlipLogic';
import styles from './flipDebug.module.css';

// Map numeric vertex types to enum
const NUM_TO_VERTEX_TYPE = [
  VertexType.a1,
  VertexType.a2,
  VertexType.b1,
  VertexType.b2,
  VertexType.c1,
  VertexType.c2,
];

// Vertex colors for visualization
const VERTEX_COLORS: Record<VertexType, string> = {
  [VertexType.a1]: '#ff6b6b', // Red
  [VertexType.a2]: '#4ecdc4', // Teal
  [VertexType.b1]: '#45b7d1', // Blue
  [VertexType.b2]: '#96ceb4', // Green
  [VertexType.c1]: '#ffd93d', // Yellow
  [VertexType.c2]: '#c9a0ff', // Purple
};

// Visual arrow representations for each vertex type
const VERTEX_ARROWS: Record<VertexType, string> = {
  [VertexType.a1]: '→↓', // In: left, top    | Out: right, bottom
  [VertexType.a2]: '←↑', // In: right, bottom | Out: left, top
  [VertexType.b1]: '↑↓', // In: left, right   | Out: top, bottom
  [VertexType.b2]: '←→', // In: top, bottom   | Out: left, right
  [VertexType.c1]: '→↑', // In: left, bottom  | Out: right, top
  [VertexType.c2]: '←↓', // In: right, top    | Out: left, bottom
};

// More detailed arrow patterns using box drawing
const VERTEX_PATTERNS: Record<VertexType, string> = {
  [VertexType.a1]: '┌→\n↓┘', // Flow from left/top to right/bottom
  [VertexType.a2]: '↑┐\n└←', // Flow from right/bottom to left/top
  [VertexType.b1]: '─┼─\n │ ', // Horizontal in, vertical out
  [VertexType.b2]: ' │ \n─┼─', // Vertical in, horizontal out
  [VertexType.c1]: '└→\n↑┘', // Flow from left/bottom to right/top
  [VertexType.c2]: '↓┐\n└←', // Flow from right/top to left/bottom
};

interface FlipHistoryEntry {
  step: number;
  position: { row: number; col: number };
  direction: FlipDirection;
  before: {
    base: VertexType;
    right?: VertexType;
    up?: VertexType;
    upRight?: VertexType;
    left?: VertexType;
    down?: VertexType;
    downLeft?: VertexType;
  };
  after: {
    base: VertexType;
    right?: VertexType;
    up?: VertexType;
    upRight?: VertexType;
    left?: VertexType;
    down?: VertexType;
    downLeft?: VertexType;
  };
  iceRuleViolations: string[];
}

export function FlipDebug() {
  const [size, setSize] = useState(5); // Small size for debugging
  const [simulation, setSimulation] = useState<OptimizedPhysicsSimulation | null>(null);
  const [currentState, setCurrentState] = useState<Uint8Array | null>(null);
  const [flipHistory, setFlipHistory] = useState<FlipHistoryEntry[]>([]);
  const [selectedFlip, setSelectedFlip] = useState<FlipHistoryEntry | null>(null);
  const [highlightPos, setHighlightPos] = useState<{ row: number; col: number } | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [autoStep, setAutoStep] = useState(false);

  // Initialize simulation
  useEffect(() => {
    const sim = new OptimizedPhysicsSimulation({
      size,
      weights: {
        a1: 1,
        a2: 1,
        b1: 1,
        b2: 1,
        c1: 1,
        c2: 1,
      },
      beta: 0.5,
      seed: 12345, // Fixed seed for reproducibility
    });

    // Initialize with DWBC High configuration
    const initialState = generateDWBCHighOptimized(size);
    sim.setState(initialState);

    setSimulation(sim);
    setCurrentState(new Uint8Array(sim.getRawState()));
    setFlipHistory([]);
    setStepCount(0);
  }, [size]);

  // Check ice rule for a vertex
  const checkIceRule = (state: Uint8Array, row: number, col: number): boolean => {
    if (row < 0 || row >= size || col < 0 || col >= size) return true;

    const vertexType = NUM_TO_VERTEX_TYPE[state[row * size + col]];
    const config = getVertexConfiguration(vertexType);

    // Count ins and outs
    let ins = 0;
    let outs = 0;

    if (config.left === 'in') ins++;
    else outs++;
    if (config.right === 'in') ins++;
    else outs++;
    if (config.top === 'in') ins++;
    else outs++;
    if (config.bottom === 'in') ins++;
    else outs++;

    return ins === 2 && outs === 2;
  };

  // Find ice rule violations in the current state
  const findIceRuleViolations = (state: Uint8Array): string[] => {
    const violations: string[] = [];

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!checkIceRule(state, row, col)) {
          const vertexType = NUM_TO_VERTEX_TYPE[state[row * size + col]];
          violations.push(`(${row},${col}): ${vertexType}`);
        }
      }
    }

    return violations;
  };

  // Capture state of 2x2 neighborhood
  const capture2x2State = (
    state: Uint8Array,
    row: number,
    col: number,
    direction: FlipDirection,
  ) => {
    const getVertex = (r: number, c: number) => {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        return NUM_TO_VERTEX_TYPE[state[r * size + c]];
      }
      return undefined;
    };

    if (direction === FlipDirection.Up) {
      return {
        base: getVertex(row, col)!,
        right: getVertex(row, col + 1),
        up: getVertex(row - 1, col),
        upRight: getVertex(row - 1, col + 1),
      };
    } else {
      return {
        base: getVertex(row, col)!,
        left: getVertex(row, col - 1),
        down: getVertex(row + 1, col),
        downLeft: getVertex(row + 1, col - 1),
      };
    }
  };

  // Execute a single flip and record history
  const executeSingleFlip = useCallback(() => {
    if (!simulation || !currentState) return;

    // Get the internal state before flip
    const beforeState = new Uint8Array(simulation.getRawState());

    // Step the simulation (this will attempt one flip)
    const stats = simulation.step();

    // Get the state after flip
    const afterState = new Uint8Array(simulation.getRawState());

    // Find all vertices that changed
    const changedPositions: { row: number; col: number }[] = [];
    for (let i = 0; i < beforeState.length; i++) {
      if (beforeState[i] !== afterState[i]) {
        changedPositions.push({
          row: Math.floor(i / size),
          col: i % size,
        });
      }
    }

    if (changedPositions.length > 0) {
      // A flip affects exactly 4 vertices in a 2x2 grid
      // Find the bounds of the changed vertices
      const minRow = Math.min(...changedPositions.map((p) => p.row));
      const maxRow = Math.max(...changedPositions.map((p) => p.row));
      const minCol = Math.min(...changedPositions.map((p) => p.col));
      const maxCol = Math.max(...changedPositions.map((p) => p.col));

      // Determine flip direction and base position
      let flipPos: { row: number; col: number };
      let flipDir: FlipDirection;

      // Check if all 4 vertices of a 2x2 grid changed
      if (changedPositions.length === 4 && maxRow - minRow === 1 && maxCol - minCol === 1) {
        // We have a 2x2 grid of changes
        // Use vertex type transformations to determine flip type

        // Get the vertex types before and after for all 4 positions
        const bottomLeft = { row: maxRow, col: minCol };
        const bottomRight = { row: maxRow, col: maxCol };
        const topLeft = { row: minRow, col: minCol };
        const topRight = { row: minRow, col: maxCol };

        const getVertexType = (state: Uint8Array, pos: { row: number; col: number }) => {
          return NUM_TO_VERTEX_TYPE[state[pos.row * size + pos.col]];
        };

        // Get before and after types for each position
        const blBefore = getVertexType(beforeState, bottomLeft);
        const blAfter = getVertexType(afterState, bottomLeft);
        const brBefore = getVertexType(beforeState, bottomRight);
        const brAfter = getVertexType(afterState, bottomRight);
        const tlBefore = getVertexType(beforeState, topLeft);
        const tlAfter = getVertexType(afterState, topLeft);
        const trBefore = getVertexType(beforeState, topRight);
        const trAfter = getVertexType(afterState, topRight);

        // Check for UP flip pattern (base at bottom-left)
        // UP flip transformations:
        // - Base (bottom-left): a1→c1, c2→a2
        // - Right (bottom-right): b2→c2, c1→b1
        // - UpRight (top-right): a2→c1, c2→a1
        // - Up (top-left): b1→c2, c1→b2

        const isUpFlip =
          // Check base (bottom-left) transformations
          ((blBefore === VertexType.a1 && blAfter === VertexType.c1) ||
            (blBefore === VertexType.c2 && blAfter === VertexType.a2)) &&
          // Check right (bottom-right) transformations
          ((brBefore === VertexType.b2 && brAfter === VertexType.c2) ||
            (brBefore === VertexType.c1 && brAfter === VertexType.b1)) &&
          // Check up-right (top-right) transformations
          ((trBefore === VertexType.a2 && trAfter === VertexType.c1) ||
            (trBefore === VertexType.c2 && trAfter === VertexType.a1)) &&
          // Check up (top-left) transformations
          ((tlBefore === VertexType.b1 && tlAfter === VertexType.c2) ||
            (tlBefore === VertexType.c1 && tlAfter === VertexType.b2));

        // Check for DOWN flip pattern (base at top-right)
        // DOWN flip transformations:
        // - Base (top-right): c1→a2, a1→c2
        // - Left (top-left): b1→c1, c2→b2
        // - DownLeft (bottom-left): c2→a1, a2→c1
        // - Down (bottom-right): c1→b1, b2→c2

        const isDownFlip =
          // Check base (top-right) transformations
          ((trBefore === VertexType.c1 && trAfter === VertexType.a2) ||
            (trBefore === VertexType.a1 && trAfter === VertexType.c2)) &&
          // Check left (top-left) transformations
          ((tlBefore === VertexType.b1 && tlAfter === VertexType.c1) ||
            (tlBefore === VertexType.c2 && tlAfter === VertexType.b2)) &&
          // Check down-left (bottom-left) transformations
          ((blBefore === VertexType.c2 && blAfter === VertexType.a1) ||
            (blBefore === VertexType.a2 && blAfter === VertexType.c1)) &&
          // Check down (bottom-right) transformations
          ((brBefore === VertexType.c1 && brAfter === VertexType.b1) ||
            (brBefore === VertexType.b2 && brAfter === VertexType.c2));

        if (isUpFlip) {
          // Up flip with base at bottom-left
          flipDir = FlipDirection.Up;
          flipPos = bottomLeft;
        } else if (isDownFlip) {
          // Down flip with base at top-right
          flipDir = FlipDirection.Down;
          flipPos = topRight;
        } else {
          // Fallback: use position-based heuristic
          // This shouldn't happen with correct flip logic
          console.warn('Could not determine flip type from transformations, using fallback');

          // Check if up flip is valid from bottom-left
          if (maxRow > 0 && minCol < size - 1) {
            flipDir = FlipDirection.Up;
            flipPos = bottomLeft;
          } else {
            // Must be down flip from top-right
            flipDir = FlipDirection.Down;
            flipPos = topRight;
          }
        }
      } else {
        // Shouldn't happen if flip logic is correct, but handle gracefully
        console.warn(`Unexpected number of changed positions: ${changedPositions.length}`);
        flipDir = FlipDirection.Up;
        flipPos = changedPositions[0] || { row: 0, col: 0 };
      }

      const entry: FlipHistoryEntry = {
        step: stepCount + 1,
        position: flipPos,
        direction: flipDir,
        before: capture2x2State(beforeState, flipPos.row, flipPos.col, flipDir),
        after: capture2x2State(afterState, flipPos.row, flipPos.col, flipDir),
        iceRuleViolations: findIceRuleViolations(afterState),
      };

      setFlipHistory((prev) => [...prev, entry]);
      setSelectedFlip(entry);
      setHighlightPos(flipPos);
    }

    setCurrentState(afterState);
    setStepCount((prev) => prev + 1);
  }, [simulation, currentState, size, stepCount]);

  // Auto-step functionality
  useEffect(() => {
    if (autoStep && simulation) {
      const interval = setInterval(() => {
        executeSingleFlip();
      }, 500);
      return () => clearInterval(interval);
    }
  }, [autoStep, executeSingleFlip, simulation]);

  // Reset simulation
  const reset = () => {
    if (!simulation) return;

    const initialState = generateDWBCHighOptimized(size);
    simulation.setState(initialState);
    setCurrentState(new Uint8Array(simulation.getRawState()));
    setFlipHistory([]);
    setStepCount(0);
    setSelectedFlip(null);
    setHighlightPos(null);
  };

  // Define edge patterns for each vertex type (which edges have paths passing through)
  // Based on paper Figure 1: edges are shaded where paths flow through them
  const getEdgePattern = (vertexType: VertexType) => {
    const patterns = {
      [VertexType.a1]: { left: true, top: true, right: true, bottom: true }, // All edges (2 straight paths)
      [VertexType.a2]: { left: false, top: false, right: false, bottom: false }, // No edges shaded
      [VertexType.b1]: { left: false, top: true, right: false, bottom: true }, // Vertical path only
      [VertexType.b2]: { left: true, top: false, right: true, bottom: false }, // Horizontal path only
      [VertexType.c1]: { left: true, top: false, right: false, bottom: true }, // L-shaped: left→bottom
      [VertexType.c2]: { left: false, top: true, right: true, bottom: false }, // L-shaped: top→right
    };
    return patterns[vertexType];
  };

  // Render the lattice
  const renderLattice = () => {
    if (!currentState) return null;

    const cellSize = Math.min(60, 400 / size);
    const edgeWidth = 4; // Width of the edge shading

    return (
      <svg width={size * cellSize} height={size * cellSize}>
        {/* Grid */}
        {Array.from({ length: size + 1 }).map((_, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={0}
              y1={i * cellSize}
              x2={size * cellSize}
              y2={i * cellSize}
              className={styles.gridLine}
            />
            <line
              x1={i * cellSize}
              y1={0}
              x2={i * cellSize}
              y2={size * cellSize}
              className={styles.gridLine}
            />
          </g>
        ))}

        {/* Vertices */}
        {Array.from({ length: size }).map((_, row) =>
          Array.from({ length: size }).map((_, col) => {
            const vertexType = NUM_TO_VERTEX_TYPE[currentState[row * size + col]];
            const isHighlighted =
              highlightPos && highlightPos.row === row && highlightPos.col === col;
            const hasViolation = !checkIceRule(currentState, row, col);
            const edges = getEdgePattern(vertexType);

            return (
              <g key={`vertex-${row}-${col}`}>
                <rect
                  x={col * cellSize + 2}
                  y={row * cellSize + 2}
                  width={cellSize - 4}
                  height={cellSize - 4}
                  fill={VERTEX_COLORS[vertexType]}
                  className={`${styles.vertexRect} ${isHighlighted ? styles.highlighted : ''} ${hasViolation ? styles.violation : ''}`}
                />

                {/* Edge path lines - draw thick lines like in the legend */}
                {/* Center point of the cell */}
                <circle
                  cx={col * cellSize + cellSize / 2}
                  cy={row * cellSize + cellSize / 2}
                  r={3}
                  fill="#333"
                />

                {/* Draw bold lines for paths */}
                {edges.left && (
                  <line
                    x1={col * cellSize + 3}
                    y1={row * cellSize + cellSize / 2}
                    x2={col * cellSize + cellSize / 2 - 3}
                    y2={row * cellSize + cellSize / 2}
                    stroke="#333"
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                )}
                {edges.right && (
                  <line
                    x1={col * cellSize + cellSize / 2 + 3}
                    y1={row * cellSize + cellSize / 2}
                    x2={col * cellSize + cellSize - 3}
                    y2={row * cellSize + cellSize / 2}
                    stroke="#333"
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                )}
                {edges.top && (
                  <line
                    x1={col * cellSize + cellSize / 2}
                    y1={row * cellSize + 3}
                    x2={col * cellSize + cellSize / 2}
                    y2={row * cellSize + cellSize / 2 - 3}
                    stroke="#333"
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                )}
                {edges.bottom && (
                  <line
                    x1={col * cellSize + cellSize / 2}
                    y1={row * cellSize + cellSize / 2 + 3}
                    x2={col * cellSize + cellSize / 2}
                    y2={row * cellSize + cellSize - 3}
                    stroke="#333"
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                )}

                {/* Draw thin lines for non-path edges */}
                {!edges.left && (
                  <line
                    x1={col * cellSize + 3}
                    y1={row * cellSize + cellSize / 2}
                    x2={col * cellSize + cellSize / 2 - 3}
                    y2={row * cellSize + cellSize / 2}
                    stroke="#999"
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                )}
                {!edges.right && (
                  <line
                    x1={col * cellSize + cellSize / 2 + 3}
                    y1={row * cellSize + cellSize / 2}
                    x2={col * cellSize + cellSize - 3}
                    y2={row * cellSize + cellSize / 2}
                    stroke="#999"
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                )}
                {!edges.top && (
                  <line
                    x1={col * cellSize + cellSize / 2}
                    y1={row * cellSize + 3}
                    x2={col * cellSize + cellSize / 2}
                    y2={row * cellSize + cellSize / 2 - 3}
                    stroke="#999"
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                )}
                {!edges.bottom && (
                  <line
                    x1={col * cellSize + cellSize / 2}
                    y1={row * cellSize + cellSize / 2 + 3}
                    x2={col * cellSize + cellSize / 2}
                    y2={row * cellSize + cellSize - 3}
                    stroke="#999"
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                )}

                <text
                  x={col * cellSize + cellSize / 2}
                  y={row * cellSize + cellSize - 5}
                  textAnchor="middle"
                  dominantBaseline="bottom"
                  fontSize={cellSize * 0.25}
                  className={styles.vertexText}
                >
                  {vertexType}
                </text>
              </g>
            );
          }),
        )}

        {/* Highlight 2x2 region if flip selected */}
        {selectedFlip && (
          <rect
            x={
              selectedFlip.direction === FlipDirection.Up
                ? selectedFlip.position.col * cellSize
                : (selectedFlip.position.col - 1) * cellSize
            }
            y={
              selectedFlip.direction === FlipDirection.Up
                ? (selectedFlip.position.row - 1) * cellSize
                : selectedFlip.position.row * cellSize
            }
            width={cellSize * 2}
            height={cellSize * 2}
            className={styles.flipRegion}
          />
        )}
      </svg>
    );
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>6-Vertex Model Flip Debugger</h1>

      <div className={styles.controls}>
        <label>
          Grid Size:{' '}
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
            <option value={4}>4x4</option>
            <option value={5}>5x5</option>
            <option value={6}>6x6</option>
            <option value={8}>8x8</option>
          </select>
        </label>{' '}
        <button onClick={reset}>Reset</button> <button onClick={executeSingleFlip}>Step</button>{' '}
        <button onClick={() => setAutoStep(!autoStep)}>{autoStep ? 'Stop' : 'Auto Step'}</button>{' '}
        <span className={styles.stepCounter}>Steps: {stepCount}</span>
      </div>

      <div className={styles.mainContent}>
        {/* Lattice visualization */}
        <div className={styles.latticeSection}>
          <h3 className={styles.sectionTitle}>Current State</h3>
          {renderLattice()}

          {/* Enhanced Legend with Edge Visualizations */}
          <div className={styles.legend}>
            <h4 className={styles.legendTitle}>Vertex Types & Edge Patterns:</h4>
            <VertexLegend showArrows={false} />
            <div className={styles.legendNote}>
              Bold edges show the connected path segments for each vertex type
            </div>
          </div>
        </div>

        {/* Flip details */}
        <div className={styles.flipSection}>
          <h3 className={styles.sectionTitle}>Flip History</h3>
          <div className={styles.flipHistory}>
            {flipHistory.map((entry, idx) => (
              <div
                key={idx}
                className={`${styles.flipEntry} ${selectedFlip === entry ? styles.selected : ''} ${entry.iceRuleViolations.length > 0 ? styles.hasViolation : ''}`}
                onClick={() => {
                  setSelectedFlip(entry);
                  setHighlightPos(entry.position);
                }}
              >
                <div className={styles.flipEntryHeader}>
                  <strong>Step {entry.step}:</strong> Flip {entry.direction} at (
                  {entry.position.row}, {entry.position.col})
                </div>
                {entry.iceRuleViolations.length > 0 && (
                  <div className={styles.violationWarning}>
                    ⚠️ Ice rule violations: {entry.iceRuleViolations.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedFlip && (
            <div className={styles.flipDetails}>
              <h4 className={styles.flipDetailsTitle}>Selected Flip Details</h4>
              <div className={styles.flipDetailsInfo}>
                Position: ({selectedFlip.position.row}, {selectedFlip.position.col})
              </div>
              <div className={styles.flipDetailsInfo}>Direction: {selectedFlip.direction}</div>

              {/* Visual representation of the 2x2 plaquette transformation */}
              <div className={styles.plaquetteComparison}>
                <div className={styles.plaquetteBefore}>
                  <h5>Before Flip:</h5>
                  <PlaquetteVisualization
                    vertices={[
                      selectedFlip.direction === FlipDirection.Up
                        ? selectedFlip.before.base
                        : selectedFlip.before.downLeft || VertexType.a1,
                      selectedFlip.direction === FlipDirection.Up
                        ? selectedFlip.before.right || VertexType.a1
                        : selectedFlip.before.down || VertexType.a1,
                      selectedFlip.direction === FlipDirection.Up
                        ? selectedFlip.before.upRight || VertexType.a1
                        : selectedFlip.before.base,
                      selectedFlip.direction === FlipDirection.Up
                        ? selectedFlip.before.up || VertexType.a1
                        : selectedFlip.before.left || VertexType.a1,
                    ]}
                    highlightEdges={true}
                  />
                </div>
                <div className={styles.flipArrow}>→</div>
                <div className={styles.plaquetteAfter}>
                  <h5>After Flip:</h5>
                  <PlaquetteVisualization
                    vertices={[
                      selectedFlip.direction === FlipDirection.Up
                        ? selectedFlip.after.base
                        : selectedFlip.after.downLeft || VertexType.a1,
                      selectedFlip.direction === FlipDirection.Up
                        ? selectedFlip.after.right || VertexType.a1
                        : selectedFlip.after.down || VertexType.a1,
                      selectedFlip.direction === FlipDirection.Up
                        ? selectedFlip.after.upRight || VertexType.a1
                        : selectedFlip.after.base,
                      selectedFlip.direction === FlipDirection.Up
                        ? selectedFlip.after.up || VertexType.a1
                        : selectedFlip.after.left || VertexType.a1,
                    ]}
                    highlightEdges={true}
                  />
                </div>
              </div>

              <h5 className={styles.flipTableSubtitle}>2x2 Neighborhood Changes:</h5>
              <table className={styles.flipTable}>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Before</th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Base</td>
                    <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.before.base] }}>
                      {selectedFlip.before.base} {VERTEX_ARROWS[selectedFlip.before.base]}
                    </td>
                    <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.after.base] }}>
                      {selectedFlip.after.base} {VERTEX_ARROWS[selectedFlip.after.base]}
                    </td>
                  </tr>
                  {selectedFlip.direction === FlipDirection.Up ? (
                    <>
                      {selectedFlip.before.right && (
                        <tr>
                          <td>Right</td>
                          <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.before.right] }}>
                            {selectedFlip.before.right} {VERTEX_ARROWS[selectedFlip.before.right]}
                          </td>
                          <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.after.right!] }}>
                            {selectedFlip.after.right} {VERTEX_ARROWS[selectedFlip.after.right!]}
                          </td>
                        </tr>
                      )}
                      {selectedFlip.before.up && (
                        <tr>
                          <td>Up</td>
                          <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.before.up] }}>
                            {selectedFlip.before.up} {VERTEX_ARROWS[selectedFlip.before.up]}
                          </td>
                          <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.after.up!] }}>
                            {selectedFlip.after.up} {VERTEX_ARROWS[selectedFlip.after.up!]}
                          </td>
                        </tr>
                      )}
                      {selectedFlip.before.upRight && (
                        <tr>
                          <td>Up-Right</td>
                          <td
                            style={{ backgroundColor: VERTEX_COLORS[selectedFlip.before.upRight] }}
                          >
                            {selectedFlip.before.upRight}{' '}
                            {VERTEX_ARROWS[selectedFlip.before.upRight]}
                          </td>
                          <td
                            style={{ backgroundColor: VERTEX_COLORS[selectedFlip.after.upRight!] }}
                          >
                            {selectedFlip.after.upRight}{' '}
                            {VERTEX_ARROWS[selectedFlip.after.upRight!]}
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <>
                      {selectedFlip.before.left && (
                        <tr>
                          <td>Left</td>
                          <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.before.left] }}>
                            {selectedFlip.before.left} {VERTEX_ARROWS[selectedFlip.before.left]}
                          </td>
                          <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.after.left!] }}>
                            {selectedFlip.after.left} {VERTEX_ARROWS[selectedFlip.after.left!]}
                          </td>
                        </tr>
                      )}
                      {selectedFlip.before.down && (
                        <tr>
                          <td>Down</td>
                          <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.before.down] }}>
                            {selectedFlip.before.down} {VERTEX_ARROWS[selectedFlip.before.down]}
                          </td>
                          <td style={{ backgroundColor: VERTEX_COLORS[selectedFlip.after.down!] }}>
                            {selectedFlip.after.down} {VERTEX_ARROWS[selectedFlip.after.down!]}
                          </td>
                        </tr>
                      )}
                      {selectedFlip.before.downLeft && (
                        <tr>
                          <td>Down-Left</td>
                          <td
                            style={{ backgroundColor: VERTEX_COLORS[selectedFlip.before.downLeft] }}
                          >
                            {selectedFlip.before.downLeft}{' '}
                            {VERTEX_ARROWS[selectedFlip.before.downLeft]}
                          </td>
                          <td
                            style={{ backgroundColor: VERTEX_COLORS[selectedFlip.after.downLeft!] }}
                          >
                            {selectedFlip.after.downLeft}{' '}
                            {VERTEX_ARROWS[selectedFlip.after.downLeft!]}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Ice Rule Violations Summary */}
      {currentState && findIceRuleViolations(currentState).length > 0 && (
        <div className={styles.violationSummary}>
          <h3>⚠️ Current Ice Rule Violations</h3>
          <ul>
            {findIceRuleViolations(currentState).map((violation, idx) => (
              <li key={idx}>{violation}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FlipDebug;
