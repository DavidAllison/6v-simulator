import { useEffect, useState } from 'react';
import { generateDWBCHigh, generateDWBCLow } from '../lib/six-vertex/initialStates';
import type { LatticeState } from '../lib/six-vertex/types';
import './dwbcDebug.css';

/**
 * Debug component to display vertex type matrices and compare with paper
 */
export function DWBCDebug() {
  const [highState, setHighState] = useState<LatticeState | null>(null);
  const [lowState, setLowState] = useState<LatticeState | null>(null);

  // Expected patterns from the paper
  const EXPECTED_HIGH = [
    ['b1', 'b1', 'b1', 'b1', 'b1', 'c2'],
    ['b1', 'b1', 'b1', 'b1', 'c2', 'b2'],
    ['b1', 'b1', 'b1', 'c2', 'b2', 'b2'],
    ['b1', 'b1', 'c2', 'b2', 'b2', 'b2'],
    ['b1', 'c2', 'b2', 'b2', 'b2', 'b2'],
    ['c2', 'b2', 'b2', 'b2', 'b2', 'b2'],
  ];

  const EXPECTED_LOW = [
    ['c2', 'a1', 'a1', 'a1', 'a1', 'a1'],
    ['a2', 'c2', 'a1', 'a1', 'a1', 'a1'],
    ['a2', 'a2', 'c2', 'a1', 'a1', 'a1'],
    ['a2', 'a2', 'a2', 'c2', 'a1', 'a1'],
    ['a2', 'a2', 'a2', 'a2', 'c2', 'a1'],
    ['a2', 'a2', 'a2', 'a2', 'a2', 'c2'],
  ];

  useEffect(() => {
    const high = generateDWBCHigh(6);
    const low = generateDWBCLow(6);
    setHighState(high);
    setLowState(low);
  }, []);

  const extractMatrix = (state: LatticeState | null) => {
    if (!state) return [];
    const matrix = [];
    for (let row = 0; row < state.height; row++) {
      const rowTypes = [];
      for (let col = 0; col < state.width; col++) {
        rowTypes.push(state.vertices[row][col].type);
      }
      matrix.push(rowTypes);
    }
    return matrix;
  };

  const compareMatrices = (actual: string[][], expected: string[][]) => {
    for (let row = 0; row < expected.length; row++) {
      for (let col = 0; col < expected[row].length; col++) {
        if (actual[row]?.[col] !== expected[row][col]) {
          return false;
        }
      }
    }
    return true;
  };

  const renderMatrix = (matrix: string[][], title: string, expected: string[][]) => {
    const matches = compareMatrices(matrix, expected);

    return (
      <div className="dwbc-debug__matrix">
        <h3 className="dwbc-debug__matrix-title">
          {title}
          <span className={`dwbc-debug__status ${matches ? 'dwbc-debug__status--match' : 'dwbc-debug__status--mismatch'}`}>
            {matches ? '✓ Matches paper' : '✗ Does not match'}
          </span>
        </h3>
        <table className="dwbc-debug__table">
          <tbody>
            {matrix.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => {
                  const expectedCell = expected[rowIdx]?.[colIdx];
                  const isMatch = cell === expectedCell;
                  const cellClasses = [
                    'dwbc-debug__cell',
                    !isMatch && 'dwbc-debug__cell--mismatch',
                    cell === 'c2' && 'dwbc-debug__cell--c2',
                    cell === 'a1' && 'dwbc-debug__cell--a1',
                    cell === 'a2' && 'dwbc-debug__cell--a2',
                    cell === 'b1' && 'dwbc-debug__cell--b1',
                    cell === 'b2' && 'dwbc-debug__cell--b2',
                  ].filter(Boolean).join(' ');
                  
                  return (
                    <td key={colIdx} className={cellClasses}>
                      {cell}
                      {!isMatch && (
                        <div className="dwbc-debug__cell-expected">(exp: {expectedCell})</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const highMatrix = extractMatrix(highState);
  const lowMatrix = extractMatrix(lowState);

  return (
    <div className="dwbc-debug">
      <h1 className="dwbc-debug__title">DWBC Pattern Debug</h1>

      <div className="dwbc-debug__info">
        <h2 className="dwbc-debug__info-title">Expected Patterns from Paper:</h2>
        <p className="dwbc-debug__info-text">
          Figure 2 (DWBC High): b1 in upper-left, c2 on anti-diagonal, b2 in lower-right
          <br />
          Figure 3 (DWBC Low): c2 on main diagonal, a1 in upper-right, a2 in lower-left
        </p>
      </div>

      <div className="dwbc-debug__grid">
        <div className="dwbc-debug__column">
          {renderMatrix(highMatrix, 'Generated DWBC High', EXPECTED_HIGH)}

          <div className="dwbc-debug__expected">
            <h4 className="dwbc-debug__expected-title">Expected DWBC High (Figure 2):</h4>
            <table className="dwbc-debug__expected-table">
              <tbody>
                {EXPECTED_HIGH.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} className="dwbc-debug__expected-cell">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dwbc-debug__column">
          {renderMatrix(lowMatrix, 'Generated DWBC Low', EXPECTED_LOW)}

          <div className="dwbc-debug__expected">
            <h4 className="dwbc-debug__expected-title">Expected DWBC Low (Figure 3):</h4>
            <table className="dwbc-debug__expected-table">
              <tbody>
              {EXPECTED_LOW.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} className="dwbc-debug__expected-cell">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dwbc-debug__legend">
        <h3 className="dwbc-debug__legend-title">Legend:</h3>
        <div className="dwbc-debug__legend-items">
          <div className="dwbc-debug__legend-item">
            <span className="dwbc-debug__legend-color" style={{ backgroundColor: '#dcfce7' }}></span>
            <span className="dwbc-debug__legend-label">a1: In(left,top) Out(right,bottom)</span>
          </div>
          <div className="dwbc-debug__legend-item">
            <span className="dwbc-debug__legend-color" style={{ backgroundColor: '#fef3c7' }}></span>
            <span className="dwbc-debug__legend-label">a2: In(right,bottom) Out(left,top)</span>
          </div>
          <div className="dwbc-debug__legend-item">
            <span className="dwbc-debug__legend-color" style={{ backgroundColor: '#ede9fe' }}></span>
            <span className="dwbc-debug__legend-label">b1: In(left,right) Out(top,bottom)</span>
          </div>
          <div className="dwbc-debug__legend-item">
            <span className="dwbc-debug__legend-color" style={{ backgroundColor: '#fce7f3' }}></span>
            <span className="dwbc-debug__legend-label">b2: In(top,bottom) Out(left,right)</span>
          </div>
          <div className="dwbc-debug__legend-item">
            <span className="dwbc-debug__legend-color" style={{ backgroundColor: '#dbeafe', fontWeight: 'bold' }}></span>
            <span className="dwbc-debug__legend-label">c2: In(right,top) Out(left,bottom)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
