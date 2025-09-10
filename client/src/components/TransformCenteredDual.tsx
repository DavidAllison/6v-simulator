import React, { useEffect, useRef } from 'react';
import type { DWBCConfig } from '../lib/six-vertex/types';
import { generateDWBCState } from '../lib/six-vertex/initialStates';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from '../lib/six-vertex/types';

/**
 * A dual display component using CSS transform for absolute centering.
 * This approach guarantees the canvases will be centered regardless of other styling.
 */
export function TransformCenteredDual() {
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
        position: 'relative',
        backgroundColor: '#f0f0f0',
      }}
    >
      {/* Container for both canvases */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          gap: '60px',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* High Configuration */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#0066cc',
            }}
          >
            DWBC High
          </h3>
          <canvas
            ref={canvasHighRef}
            style={{
              border: '3px solid #0066cc',
              borderRadius: '8px',
              display: 'block',
            }}
          />
          <div
            style={{
              marginTop: '15px',
              fontSize: '14px',
              color: '#666',
            }}
          >
            Anti-diagonal c₂ pattern
          </div>
        </div>

        {/* Low Configuration */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#cc0066',
            }}
          >
            DWBC Low
          </h3>
          <canvas
            ref={canvasLowRef}
            style={{
              border: '3px solid #cc0066',
              borderRadius: '8px',
              display: 'block',
            }}
          />
          <div
            style={{
              marginTop: '15px',
              fontSize: '14px',
              color: '#666',
            }}
          >
            Main diagonal c₂ pattern
          </div>
        </div>
      </div>

      {/* Title at top */}
      <div
        style={{
          position: 'absolute',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#333',
            margin: '0',
          }}
        >
          6-Vertex Model: DWBC Configurations
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#666',
            marginTop: '10px',
          }}
        >
          Domain Wall Boundary Conditions - Centered Display
        </p>
      </div>
    </div>
  );
}

export default TransformCenteredDual;