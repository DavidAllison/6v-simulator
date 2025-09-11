import React from 'react';
import { DualSimulationDisplay } from '../components/DualSimulationDisplay';

export default function TestCentering() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '10px',
        backgroundColor: '#f0f0f0',
        borderBottom: '1px solid #ccc'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Canvas Centering Test (VM-Optimized)</h2>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
          Press <kbd>F</kbd> to fit canvas | Press <kbd>R</kbd> to reset view | Matrices should auto-center after retry attempts
        </p>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DualSimulationDisplay />
      </div>
    </div>
  );
}