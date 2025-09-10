import React, { useEffect, useRef } from 'react';
import type { DWBCConfig } from '../lib/six-vertex/types';
import { generateDWBCState } from '../lib/six-vertex/initialStates';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from '../lib/six-vertex/types';

/**
 * Simplest possible dual display component for testing
 * No fancy features, just two canvases side by side
 */
export function SimplestDualDisplay() {
  const canvasHighRef = useRef<HTMLCanvasElement>(null);
  const canvasLowRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log('SimplestDualDisplay mounted');

    // Generate states
    const configHigh: DWBCConfig = { type: 'high' };
    const configLow: DWBCConfig = { type: 'low' };

    const latticeHigh = generateDWBCState(8, 8, configHigh);
    const latticeLow = generateDWBCState(8, 8, configLow);

    console.log('Generated lattices:', {
      high: latticeHigh ? 'success' : 'failed',
      low: latticeLow ? 'success' : 'failed',
    });
    
    // Calculate proper canvas size for 8x8 lattice with cellSize 30
    const cellSize = 30;
    const canvasSize = (8 + 1) * cellSize; // 9 * 30 = 270

    // Render High
    const canvasHigh = canvasHighRef.current;
    if (canvasHigh && latticeHigh) {
      // Set canvas size to match the lattice
      canvasHigh.width = canvasSize;
      canvasHigh.height = canvasSize;
      
      const ctx = canvasHigh.getContext('2d');
      if (ctx) {
        // Clear and fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasHigh.width, canvasHigh.height);
      }

      // Use PathRenderer
      try {
        const renderer = new PathRenderer(canvasHigh, {
          cellSize: cellSize,
          mode: RenderMode.Paths,
          lineWidth: 3,
          colors: {
            background: '#ffffff',
            grid: '#e0e0e0',
            pathSegment: '#0066cc',
            arrow: '#333333',
            vertexTypes: {
              a1: '#ff0000',
              a2: '#00ff00',
              b1: '#0000ff',
              b2: '#ffff00',
              c1: '#ff00ff',
              c2: '#00ffff',
            },
          },
          showGrid: true,
        });

        renderer.render(latticeHigh);
        console.log('Rendered DWBC High');
      } catch (err) {
        console.error('Error rendering high:', err);
      }
    }

    // Render Low
    const canvasLow = canvasLowRef.current;
    if (canvasLow && latticeLow) {
      // Set canvas size to match the lattice
      canvasLow.width = canvasSize;
      canvasLow.height = canvasSize;
      
      const ctx = canvasLow.getContext('2d');
      if (ctx) {
        // Clear and fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasLow.width, canvasLow.height);
      }

      // Use PathRenderer
      try {
        const renderer = new PathRenderer(canvasLow, {
          cellSize: cellSize,
          mode: RenderMode.Paths,
          lineWidth: 3,
          colors: {
            background: '#ffffff',
            grid: '#e0e0e0',
            pathSegment: '#cc0066',
            arrow: '#333333',
            vertexTypes: {
              a1: '#ff0000',
              a2: '#00ff00',
              b1: '#0000ff',
              b2: '#ffff00',
              c1: '#ff00ff',
              c2: '#00ffff',
            },
          },
          showGrid: true,
        });

        renderer.render(latticeLow);
        console.log('Rendered DWBC Low');
      } catch (err) {
        console.error('Error rendering low:', err);
      }
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        gap: '20px',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          border: '2px solid #333',
          backgroundColor: 'white',
          padding: '10px',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>DWBC High Configuration</h3>
        <canvas
          ref={canvasHighRef}
          width={270}
          height={270}
          style={{
            display: 'block',
            border: '1px solid #ccc',
          }}
        />
      </div>

      <div
        style={{
          border: '2px solid #333',
          backgroundColor: 'white',
          padding: '10px',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>DWBC Low Configuration</h3>
        <canvas
          ref={canvasLowRef}
          width={270}
          height={270}
          style={{
            display: 'block',
            border: '1px solid #ccc',
          }}
        />
      </div>
    </div>
  );
}

export default SimplestDualDisplay;
