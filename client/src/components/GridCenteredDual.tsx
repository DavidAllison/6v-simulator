import React, { useEffect, useRef } from 'react';
import type { DWBCConfig } from '../lib/six-vertex/types';
import { generateDWBCState } from '../lib/six-vertex/initialStates';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from '../lib/six-vertex/types';

/**
 * A dual display component using CSS Grid for perfect centering.
 * Grid provides the most robust centering solution for complex layouts.
 */
export function GridCenteredDual() {
  const canvasHighRef = useRef<HTMLCanvasElement>(null);
  const canvasLowRef = useRef<HTMLCanvasElement>(null);
  const size = 8;
  const cellSize = 30;
  const canvasSize = (size + 1) * cellSize; // 270px

  useEffect(() => {
    // Generate states
    const configHigh: DWBCConfig = { type: 'high' };
    const configLow: DWBCConfig = { type: 'low' };

    const latticeHigh = generateDWBCState(size, size, configHigh);
    const latticeLow = generateDWBCState(size, size, configLow);

    // Render High Configuration
    const canvasHigh = canvasHighRef.current;
    if (canvasHigh && latticeHigh) {
      canvasHigh.width = canvasSize;
      canvasHigh.height = canvasSize;

      const renderer = new PathRenderer(canvasHigh, {
        cellSize: cellSize,
        mode: RenderMode.Paths,
        lineWidth: 3,
        colors: {
          background: '#ffffff',
          grid: '#e0e0e0',
          pathSegment: '#0066cc',
          arrow: '#333333',
        },
        showGrid: true,
      });

      renderer.render(latticeHigh);
    }

    // Render Low Configuration
    const canvasLow = canvasLowRef.current;
    if (canvasLow && latticeLow) {
      canvasLow.width = canvasSize;
      canvasLow.height = canvasSize;

      const renderer = new PathRenderer(canvasLow, {
        cellSize: cellSize,
        mode: RenderMode.Paths,
        lineWidth: 3,
        colors: {
          background: '#ffffff',
          grid: '#e0e0e0',
          pathSegment: '#cc0066',
          arrow: '#333333',
        },
        showGrid: true,
      });

      renderer.render(latticeLow);
    }
  }, [canvasSize, cellSize, size]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      {/* Main content container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          padding: '50px',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* High Configuration Card */}
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            padding: '30px',
            backgroundColor: '#f0f8ff',
            borderRadius: '12px',
            border: '2px solid #0066cc',
          }}
        >
          <h3
            style={{
              margin: '0 0 20px 0',
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#0066cc',
              textAlign: 'center',
            }}
          >
            DWBC High Configuration
          </h3>
          <canvas
            ref={canvasHighRef}
            style={{
              display: 'block',
              boxShadow: '0 4px 12px rgba(0, 102, 204, 0.2)',
              borderRadius: '4px',
            }}
          />
          <div
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#0066cc',
              color: 'white',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Anti-diagonal pattern
          </div>
        </div>

        {/* Low Configuration Card */}
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            padding: '30px',
            backgroundColor: '#fff0f5',
            borderRadius: '12px',
            border: '2px solid #cc0066',
          }}
        >
          <h3
            style={{
              margin: '0 0 20px 0',
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#cc0066',
              textAlign: 'center',
            }}
          >
            DWBC Low Configuration
          </h3>
          <canvas
            ref={canvasLowRef}
            style={{
              display: 'block',
              boxShadow: '0 4px 12px rgba(204, 0, 102, 0.2)',
              borderRadius: '4px',
            }}
          />
          <div
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#cc0066',
              color: 'white',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Main diagonal pattern
          </div>
        </div>
      </div>

      {/* Floating title */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          padding: '20px 40px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '30px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1
          style={{
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #0066cc 0%, #cc0066 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0',
          }}
        >
          6-Vertex Model DWBC
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#666',
            marginTop: '8px',
            margin: '8px 0 0 0',
          }}
        >
          Grid-centered visualization with perfect alignment
        </p>
      </div>
    </div>
  );
}

export default GridCenteredDual;