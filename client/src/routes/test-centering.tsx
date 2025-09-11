import React, { useState, useEffect } from 'react';
import { DualSimulationDisplay } from '../components/DualSimulationDisplay';
import { initializeHigh, initializeLow } from '../lib/six-vertex/initialStates';
import type { LatticeState } from '../lib/six-vertex/types';

export default function TestCentering() {
  const [latticeA, setLatticeA] = useState<LatticeState | null>(null);
  const [latticeB, setLatticeB] = useState<LatticeState | null>(null);
  const [showArrows, setShowArrows] = useState(false);
  const [latticeSize, setLatticeSize] = useState(16);

  // Initialize lattices
  useEffect(() => {
    setLatticeA(initializeHigh(latticeSize));
    setLatticeB(initializeLow(latticeSize));
  }, [latticeSize]);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        padding: '10px',
        backgroundColor: 'white',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Centering Test</h2>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label>
            Size:
            <select 
              value={latticeSize} 
              onChange={(e) => setLatticeSize(Number(e.target.value))}
              style={{ marginLeft: '5px' }}
            >
              <option value={8}>8x8</option>
              <option value={16}>16x16</option>
              <option value={24}>24x24</option>
              <option value={32}>32x32</option>
            </select>
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={showArrows}
              onChange={(e) => setShowArrows(e.target.checked)}
            />
            Show Arrows
          </label>
        </div>
        
        <div style={{
          padding: '5px 10px',
          backgroundColor: '#e8f4fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          fontSize: '0.9rem',
          color: '#1976d2'
        }}>
          Press <kbd>F</kbd> to fit | <kbd>R</kbd> to reset
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: 0, padding: '10px' }}>
        <DualSimulationDisplay
          latticeA={latticeA}
          latticeB={latticeB}
          showArrows={showArrows}
          cellSize={20}
        />
      </div>
      
      <div style={{
        padding: '10px',
        backgroundColor: 'white',
        borderTop: '1px solid #ddd',
        fontSize: '0.85rem',
        color: '#666',
        textAlign: 'center'
      }}>
        VM Display Fix: If matrices appear in corner, press <strong>F</strong> key or change display resolution temporarily
      </div>
    </div>
  );
}