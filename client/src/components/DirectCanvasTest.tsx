import React, { useRef, useEffect } from 'react';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from '../lib/six-vertex/types';
import type { DWBCConfig } from '../lib/six-vertex/types';
import { generateDWBCState } from '../lib/six-vertex/initialStates';

export function DirectCanvasTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a simple 8x8 lattice with DWBC High configuration
    const config: DWBCConfig = { type: 'high' };
    const lattice = generateDWBCState(8, 8, config);

    if (!lattice) {
      console.error('Failed to generate lattice state');
      return;
    }

    console.log('DirectCanvasTest: Rendering lattice', {
      size: `${lattice.width}x${lattice.height}`,
      canvas: { width: canvas.width, height: canvas.height },
    });

    // Create renderer with bright visible colors
    const renderer = new PathRenderer(canvas, {
      cellSize: 30,
      mode: RenderMode.Paths,
      lineWidth: 4,
      colors: {
        background: '#ffffff',
        grid: '#cccccc',
        pathSegment: '#ff0000', // Bright red
        arrow: '#0000ff',
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

    // Render the lattice
    renderer.render(lattice);

    // Also draw a simple test pattern directly
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw a border around the entire canvas
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Draw some test text
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.fillText('Direct Canvas Test', 10, 20);
    }
  }, []);

  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h2>Direct Canvas Test (No PanZoomCanvas)</h2>
      <p>This should show:</p>
      <ul>
        <li>White background</li>
        <li>Gray grid lines</li>
        <li>Red paths for the 6-vertex model</li>
        <li>Green border around canvas</li>
        <li>Test text in top-left</li>
      </ul>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{
          display: 'block',
          border: '2px solid blue',
          background: 'white',
        }}
      />
    </div>
  );
}
