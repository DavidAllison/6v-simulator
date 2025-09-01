import React, { useEffect, useRef } from 'react';
import { generateDWBCHigh, generateDWBCLow } from '../lib/six-vertex/initialStates';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';

const TestSimpleMatrix: React.FC = () => {
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const N = 8; // Small size for testing
    
    // Generate states
    const highState = generateDWBCHigh(N);
    const lowState = generateDWBCLow(N);
    
    console.log('Generated states:', { highState, lowState });
    
    // Render High state
    if (canvas1Ref.current) {
      const canvas = canvas1Ref.current;
      // Don't pre-set canvas size - PathRenderer will do it
      
      const renderer = new PathRenderer(canvas, {
        cellSize: 30,
        lineWidth: 3,
        colors: {
          background: '#2a2a2a',
          grid: '#444',
          pathSegment: '#4ECDC4',
          arrow: '#666',
          vertexTypes: {
            'a1': '#ff4444',
            'a2': '#44ff44',
            'b1': '#4444ff',
            'b2': '#ffff44',
            'c1': '#ff44ff',
            'c2': '#44ffff',
          },
        },
        showGrid: true,
        mode: 'paths' as const,
      });
      
      console.log('Rendering DWBC High...');
      renderer.render(highState);
    }
    
    // Render Low state
    if (canvas2Ref.current) {
      const canvas = canvas2Ref.current;
      // Don't pre-set canvas size - PathRenderer will do it
      
      const renderer = new PathRenderer(canvas, {
        cellSize: 30,
        lineWidth: 3,
        colors: {
          background: '#2a2a2a',
          grid: '#444',
          pathSegment: '#F38181',
          arrow: '#666',
          vertexTypes: {
            'a1': '#ff4444',
            'a2': '#44ff44',
            'b1': '#4444ff',
            'b2': '#ffff44',
            'c1': '#ff44ff',
            'c2': '#44ffff',
          },
        },
        showGrid: true,
        mode: 'paths' as const,
      });
      
      console.log('Rendering DWBC Low...');
      renderer.render(lowState);
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
      <h1 style={{ color: 'white' }}>Simple Matrix Test</h1>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <h2 style={{ color: 'white', marginBottom: '10px' }}>DWBC High</h2>
          <canvas 
            ref={canvas1Ref}
            style={{ 
              border: '2px solid #444',
              display: 'block'
            }}
          />
        </div>
        
        <div>
          <h2 style={{ color: 'white', marginBottom: '10px' }}>DWBC Low</h2>
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

export default TestSimpleMatrix;