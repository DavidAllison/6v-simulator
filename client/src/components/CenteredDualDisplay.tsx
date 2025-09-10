import React, { useEffect, useRef } from 'react';
import type { DWBCConfig } from '../lib/six-vertex/types';
import { generateDWBCState } from '../lib/six-vertex/initialStates';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from '../lib/six-vertex/types';

interface CenteredDualDisplayProps {
  size?: number;
  cellSize?: number;
}

/**
 * A dual display component with properly centered canvases.
 * This component ensures canvases are centered both in their containers
 * and on the page using flexbox layout.
 */
export function CenteredDualDisplay({ 
  size = 8, 
  cellSize = 30 
}: CenteredDualDisplayProps) {
  const canvasHighRef = useRef<HTMLCanvasElement>(null);
  const canvasLowRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Generate states
    const configHigh: DWBCConfig = { type: 'high' };
    const configLow: DWBCConfig = { type: 'low' };

    const latticeHigh = generateDWBCState(size, size, configHigh);
    const latticeLow = generateDWBCState(size, size, configLow);

    // Calculate canvas size
    const canvasSize = (size + 1) * cellSize;

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
    }
  }, [size, cellSize]);

  const canvasSize = (size + 1) * cellSize;

  return (
    <div
      style={{
        // Full viewport with flexbox centering
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          // Inner container with horizontal layout
          display: 'flex',
          gap: '40px',
          padding: '20px',
        }}
      >
        {/* High Configuration Panel */}
        <div
          style={{
            // Panel styling
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h3 
            style={{ 
              margin: '0 0 20px 0', 
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
            }}
          >
            DWBC High Configuration
          </h3>
          <div
            style={{
              // Canvas wrapper for overflow control
              position: 'relative',
              width: `${canvasSize}px`,
              height: `${canvasSize}px`,
              border: '2px solid #0066cc',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={canvasHighRef}
              style={{
                // Canvas positioning
                position: 'absolute',
                top: '0',
                left: '0',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* Low Configuration Panel */}
        <div
          style={{
            // Panel styling
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h3 
            style={{ 
              margin: '0 0 20px 0', 
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
            }}
          >
            DWBC Low Configuration
          </h3>
          <div
            style={{
              // Canvas wrapper for overflow control
              position: 'relative',
              width: `${canvasSize}px`,
              height: `${canvasSize}px`,
              border: '2px solid #cc0066',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={canvasLowRef}
              style={{
                // Canvas positioning
                position: 'absolute',
                top: '0',
                left: '0',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CenteredDualDisplay;