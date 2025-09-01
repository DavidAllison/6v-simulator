import React, { useEffect, useRef } from 'react';
import { generateDWBCHigh, generateDWBCLow } from '../lib/six-vertex/initialStates';
import { VertexType } from '../lib/six-vertex/types';

const TestManualRender: React.FC = () => {
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const N = 8; // Small size for testing
    const cellSize = 30;
    
    // Generate states
    const highState = generateDWBCHigh(N);
    const lowState = generateDWBCLow(N);
    
    console.log('Generated states:', { highState, lowState });
    
    // Manually render High state
    if (canvas1Ref.current) {
      const canvas = canvas1Ref.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = (N + 1) * cellSize;
      canvas.height = (N + 1) * cellSize;
      
      // Clear with dark background
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      for (let i = 0; i <= N; i++) {
        ctx.beginPath();
        ctx.moveTo((i + 0.5) * cellSize, cellSize / 2);
        ctx.lineTo((i + 0.5) * cellSize, (N + 0.5) * cellSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cellSize / 2, (i + 0.5) * cellSize);
        ctx.lineTo((N + 0.5) * cellSize, (i + 0.5) * cellSize);
        ctx.stroke();
      }
      
      // Draw paths based on vertex types
      ctx.strokeStyle = '#4ECDC4';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      for (let row = 0; row < N; row++) {
        for (let col = 0; col < N; col++) {
          const vertex = highState.vertices[row][col];
          const cx = (col + 1) * cellSize;
          const cy = (row + 1) * cellSize;
          const half = cellSize / 2;
          
          // Draw based on vertex type
          switch (vertex.type) {
            case VertexType.a1:
              // Cross pattern
              ctx.beginPath();
              ctx.moveTo(cx - half, cy);
              ctx.lineTo(cx + half, cy);
              ctx.stroke();
              
              ctx.beginPath();
              ctx.moveTo(cx, cy - half);
              ctx.lineTo(cx, cy + half);
              ctx.stroke();
              break;
              
            case VertexType.b1:
              // Vertical line
              ctx.beginPath();
              ctx.moveTo(cx, cy - half);
              ctx.lineTo(cx, cy + half);
              ctx.stroke();
              break;
              
            case VertexType.b2:
              // Horizontal line
              ctx.beginPath();
              ctx.moveTo(cx - half, cy);
              ctx.lineTo(cx + half, cy);
              ctx.stroke();
              break;
              
            case VertexType.c1:
              // L-shape: left and bottom
              ctx.beginPath();
              ctx.moveTo(cx - half, cy);
              ctx.lineTo(cx, cy);
              ctx.lineTo(cx, cy + half);
              ctx.stroke();
              break;
              
            case VertexType.c2:
              // L-shape: top and right
              ctx.beginPath();
              ctx.moveTo(cx, cy - half);
              ctx.lineTo(cx, cy);
              ctx.lineTo(cx + half, cy);
              ctx.stroke();
              break;
          }
        }
      }
      
      // Add label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('DWBC High', 10, 20);
    }
    
    // Manually render Low state
    if (canvas2Ref.current) {
      const canvas = canvas2Ref.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = (N + 1) * cellSize;
      canvas.height = (N + 1) * cellSize;
      
      // Clear with dark background
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      for (let i = 0; i <= N; i++) {
        ctx.beginPath();
        ctx.moveTo((i + 0.5) * cellSize, cellSize / 2);
        ctx.lineTo((i + 0.5) * cellSize, (N + 0.5) * cellSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cellSize / 2, (i + 0.5) * cellSize);
        ctx.lineTo((N + 0.5) * cellSize, (i + 0.5) * cellSize);
        ctx.stroke();
      }
      
      // Draw paths based on vertex types
      ctx.strokeStyle = '#F38181';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      for (let row = 0; row < N; row++) {
        for (let col = 0; col < N; col++) {
          const vertex = lowState.vertices[row][col];
          const cx = (col + 1) * cellSize;
          const cy = (row + 1) * cellSize;
          const half = cellSize / 2;
          
          // Draw based on vertex type
          switch (vertex.type) {
            case VertexType.a1:
              // Cross pattern
              ctx.beginPath();
              ctx.moveTo(cx - half, cy);
              ctx.lineTo(cx + half, cy);
              ctx.stroke();
              
              ctx.beginPath();
              ctx.moveTo(cx, cy - half);
              ctx.lineTo(cx, cy + half);
              ctx.stroke();
              break;
              
            case VertexType.b1:
              // Vertical line
              ctx.beginPath();
              ctx.moveTo(cx, cy - half);
              ctx.lineTo(cx, cy + half);
              ctx.stroke();
              break;
              
            case VertexType.b2:
              // Horizontal line
              ctx.beginPath();
              ctx.moveTo(cx - half, cy);
              ctx.lineTo(cx + half, cy);
              ctx.stroke();
              break;
              
            case VertexType.c1:
              // L-shape: left and bottom
              ctx.beginPath();
              ctx.moveTo(cx - half, cy);
              ctx.lineTo(cx, cy);
              ctx.lineTo(cx, cy + half);
              ctx.stroke();
              break;
              
            case VertexType.c2:
              // L-shape: top and right
              ctx.beginPath();
              ctx.moveTo(cx, cy - half);
              ctx.lineTo(cx, cy);
              ctx.lineTo(cx + half, cy);
              ctx.stroke();
              break;
          }
        }
      }
      
      // Add label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('DWBC Low', 10, 20);
    }
  }, []);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      padding: '20px',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: 'white' }}>Manual Render Test</h1>
      <p style={{ color: '#ccc' }}>Direct canvas rendering without PathRenderer</p>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <canvas 
            ref={canvas1Ref}
            style={{ 
              border: '2px solid #444',
              display: 'block'
            }}
          />
        </div>
        
        <div>
          <canvas 
            ref={canvas2Ref}
            style={{ 
              border: '2px solid #444',
              display: 'block'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TestManualRender;