import React, { useState, useRef, useEffect } from 'react';
import type { DWBCConfig, LatticeState } from './lib/six-vertex/types';
import { generateDWBCState } from './lib/six-vertex/initialStates';
import { PathRenderer } from './lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from './lib/six-vertex/types';

export function TestCanvasPage() {
  const [showDebug, setShowDebug] = useState(true);
  const canvasRef1 = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Generate two different lattice configurations
      const configHigh: DWBCConfig = { type: 'high' };
      const configLow: DWBCConfig = { type: 'low' };
      
      const latticeHigh = generateDWBCState(8, 8, configHigh);
      const latticeLow = generateDWBCState(8, 8, configLow);

      if (!latticeHigh || !latticeLow) {
        setError('Failed to generate lattice states');
        return;
      }

      // Render to first canvas
      if (canvasRef1.current) {
        const ctx = canvasRef1.current.getContext('2d');
        if (ctx) {
          // Clear and set background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 300, 300);

          // Create renderer
          const renderer = new PathRenderer(canvasRef1.current, {
            cellSize: 30,
            mode: RenderMode.Paths,
            lineWidth: 3,
            colors: {
              background: '#ffffff',
              grid: '#e0e0e0',
              pathSegment: '#2196F3', // Blue paths
              arrow: '#666666',
              vertexTypes: {
                a1: '#ff4444',
                a2: '#44ff44',
                b1: '#4444ff',
                b2: '#ffff44',
                c1: '#ff44ff',
                c2: '#44ffff',
              },
            },
            showGrid: true,
          });
          
          renderer.render(latticeHigh);

          // Add label
          ctx.fillStyle = '#000000';
          ctx.font = '14px Arial';
          ctx.fillText('DWBC High', 10, 20);
        }
      }

      // Render to second canvas
      if (canvasRef2.current) {
        const ctx = canvasRef2.current.getContext('2d');
        if (ctx) {
          // Clear and set background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 300, 300);

          // Create renderer
          const renderer = new PathRenderer(canvasRef2.current, {
            cellSize: 30,
            mode: RenderMode.Paths,
            lineWidth: 3,
            colors: {
              background: '#ffffff',
              grid: '#e0e0e0',
              pathSegment: '#F44336', // Red paths
              arrow: '#666666',
              vertexTypes: {
                a1: '#ff4444',
                a2: '#44ff44',
                b1: '#4444ff',
                b2: '#ffff44',
                c1: '#ff44ff',
                c2: '#44ffff',
              },
            },
            showGrid: true,
          });
          
          renderer.render(latticeLow);

          // Add label
          ctx.fillStyle = '#000000';
          ctx.font = '14px Arial';
          ctx.fillText('DWBC Low', 10, 20);
        }
      }
    } catch (err) {
      console.error('Error in TestCanvasPage:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#f5f5f5' }}>
      <h1>Canvas Test Page</h1>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          background: '#ffebee', 
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          style={{
            padding: '10px 20px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </button>
      </div>

      {showDebug && (
        <div style={{ 
          padding: '20px', 
          background: 'white',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Debug Information</h3>
          <ul>
            <li>React component loaded: ✓</li>
            <li>Canvas refs created: ✓</li>
            <li>Lattice generation: {error ? '✗' : '✓'}</li>
            <li>Rendering: {error ? '✗' : 'Check canvases below'}</li>
          </ul>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        flexWrap: 'wrap',
        justifyContent: 'center' 
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>DWBC High Configuration</h2>
          <canvas
            ref={canvasRef1}
            width={300}
            height={300}
            style={{
              display: 'block',
              border: '2px solid #2196F3',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>DWBC Low Configuration</h2>
          <canvas
            ref={canvasRef2}
            width={300}
            height={300}
            style={{
              display: 'block',
              border: '2px solid #F44336',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
    </div>
  );
}