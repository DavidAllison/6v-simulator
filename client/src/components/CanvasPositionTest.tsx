import React, { useRef, useEffect } from 'react';
import { PanZoomCanvas } from './PanZoomCanvas';

/**
 * Test component to verify canvas positioning fix
 */
export function CanvasPositionTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 200, 200);

    // Draw a centered red square
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(75, 75, 50, 50);

    // Draw corner markers
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(0, 0, 10, 10); // Top-left
    ctx.fillRect(190, 0, 10, 10); // Top-right
    ctx.fillRect(0, 190, 10, 10); // Bottom-left
    ctx.fillRect(190, 190, 10, 10); // Bottom-right

    // Draw center crosshair
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 90);
    ctx.lineTo(100, 110);
    ctx.moveTo(90, 100);
    ctx.lineTo(110, 100);
    ctx.stroke();

    // Add text
    ctx.fillStyle = '#000000';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Canvas Test', 100, 20);
    ctx.fillText('200x200', 100, 180);
  }, []);

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#ffffff' 
    }}>
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6'
      }}>
        <h1>Canvas Position Test</h1>
        <p>This test verifies that the canvas is properly centered within the PanZoomCanvas container.</p>
        <ul>
          <li>Red square: Should be in the center of the canvas</li>
          <li>Blue corners: Mark the canvas boundaries</li>
          <li>Crosshair: Marks the exact center</li>
        </ul>
      </div>
      
      <div style={{ 
        flex: 1, 
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          width: '600px',
          height: '400px',
          border: '2px solid #007bff',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <PanZoomCanvas
            width={200}
            height={200}
            minZoom={0.5}
            maxZoom={3}
            fitMode="contain"
            showControls={true}
            label="Canvas Position Test"
          >
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              style={{
                imageRendering: 'pixelated'
              }}
            />
          </PanZoomCanvas>
        </div>
      </div>

      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #dee2e6',
        textAlign: 'center'
      }}>
        <p>Use the zoom controls to verify the canvas stays properly positioned during zoom and pan operations.</p>
      </div>
    </div>
  );
}