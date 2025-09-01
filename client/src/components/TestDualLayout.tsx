import React, { useEffect, useRef, useState } from 'react';
import { generateDWBCHigh, generateDWBCLow } from '../lib/six-vertex/initialStates';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import type { LatticeState } from '../lib/six-vertex/types';

const TestDualLayout: React.FC = () => {
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const container1Ref = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);
  
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  
  // Refs for states and renderers
  const state1Ref = useRef<LatticeState | null>(null);
  const state2Ref = useRef<LatticeState | null>(null);
  const renderer1Ref = useRef<PathRenderer | null>(null);
  const renderer2Ref = useRef<PathRenderer | null>(null);
  
  // Configuration for simulations
  const N = 24; // Lattice size

  // Initialize states
  const initializeStates = () => {
    // Create DWBC High state
    state1Ref.current = generateDWBCHigh(N);
    
    // Create DWBC Low state
    state2Ref.current = generateDWBCLow(N);
  };
  
  // Render a state to a canvas
  const renderState = (
    canvas: HTMLCanvasElement, 
    renderer: PathRenderer, 
    state: LatticeState,
    label: string
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scale to fit canvas with padding
    const padding = 40;
    const availableWidth = canvas.width - (2 * padding);
    const availableHeight = canvas.height - (2 * padding);
    const scale = Math.min(
      availableWidth / (N * 20),
      availableHeight / (N * 20)
    );
    
    // Center the matrix
    const matrixWidth = N * 20 * scale;
    const matrixHeight = N * 20 * scale;
    const offsetX = (canvas.width - matrixWidth) / 2;
    const offsetY = (canvas.height - matrixHeight) / 2;
    
    // Save context state
    ctx.save();
    
    // Apply transformations
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    // Render the lattice
    renderer.render(state);
    
    // Restore context
    ctx.restore();
    
    // Add label overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, 10, 10);
    
    // Add subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  };

  // Resize canvases and reinitialize renderers
  const resizeCanvases = () => {
    if (container1Ref.current && canvas1Ref.current) {
      const rect = container1Ref.current.getBoundingClientRect();
      const width = Math.floor(rect.width - 40);
      const height = Math.floor(rect.height - 40);
      
      canvas1Ref.current.width = width;
      canvas1Ref.current.height = height;
      
      // Create renderer for canvas 1
      renderer1Ref.current = new PathRenderer(canvas1Ref.current, {
        cellSize: 20,
        lineWidth: 3,
        colors: {
          background: 'transparent',
          grid: '#333',
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
        showGrid: false,
        animateFlips: false,
        animationDuration: 0,
        mode: 'paths' as const,
      });
      
      // Render initial state if it exists
      if (state1Ref.current) {
        renderState(canvas1Ref.current, renderer1Ref.current, state1Ref.current, 'DWBC High');
      }
    }

    if (container2Ref.current && canvas2Ref.current) {
      const rect = container2Ref.current.getBoundingClientRect();
      const width = Math.floor(rect.width - 40);
      const height = Math.floor(rect.height - 40);
      
      canvas2Ref.current.width = width;
      canvas2Ref.current.height = height;
      
      // Create renderer for canvas 2
      renderer2Ref.current = new PathRenderer(canvas2Ref.current, {
        cellSize: 20,
        lineWidth: 3,
        colors: {
          background: 'transparent',
          grid: '#333',
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
        showGrid: false,
        animateFlips: false,
        animationDuration: 0,
        mode: 'paths' as const,
      });
      
      // Render initial state if it exists
      if (state2Ref.current) {
        renderState(canvas2Ref.current, renderer2Ref.current, state2Ref.current, 'DWBC Low');
      }
    }
  };
  
  // Handle reset
  const handleReset = () => {
    initializeStates();
    resizeCanvases();
  };

  // Initialize on mount
  useEffect(() => {
    initializeStates();
    resizeCanvases();
    
    // Handle window resize
    const handleResize = () => {
      resizeCanvases();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Small delay to ensure layout is complete
    setTimeout(() => {
      resizeCanvases();
    }, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Inline styles for absolute clarity
  const containerStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'row',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'fixed',
    top: 0,
    left: 0,
  };

  const sidebarStyle: React.CSSProperties = {
    width: '250px',
    height: '100vh',
    backgroundColor: '#2a2a2a',
    color: '#e0e0e0',
    padding: '20px',
    boxSizing: 'border-box',
    overflow: 'auto',
    borderRight: '1px solid #444',
    flexShrink: 0,
  };

  const rightSidebarStyle: React.CSSProperties = {
    ...sidebarStyle,
    borderRight: 'none',
    borderLeft: '1px solid #444',
  };

  const middleColumnStyle: React.CSSProperties = {
    flex: 1,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
    boxSizing: 'border-box',
    backgroundColor: '#1a1a1a',
    gap: '10px',
    minWidth: 0, // Allow flex shrinking
  };

  const canvasContainerStyle: React.CSSProperties = {
    flex: '1 1 50%', // Each takes exactly 50%
    backgroundColor: '#2d2d2d',
    border: '2px solid #444',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 0, // Critical for flex children
    padding: '20px',
    boxSizing: 'border-box',
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #444',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#999',
    marginBottom: '5px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#fff',
    fontFamily: 'monospace',
  };

  return (
    <div style={containerStyle}>
      {/* Left Sidebar */}
      <div style={sidebarStyle}>
        <h2 style={titleStyle}>Control Panel</h2>
        
        <div style={sectionStyle}>
          <div style={labelStyle}>Simulation Status</div>
          <div style={valueStyle}>Static Display</div>
        </div>
        
        <div style={sectionStyle}>
          <div style={labelStyle}>Mode</div>
          <div style={valueStyle}>Dual 6-Vertex</div>
        </div>
        
        <div style={sectionStyle}>
          <div style={labelStyle}>Layout</div>
          <div style={valueStyle}>3-Column</div>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Lattice Size</div>
          <div style={valueStyle}>{N} × {N}</div>
        </div>

        <hr style={{ borderColor: '#444', margin: '20px 0' }} />

        <div style={sectionStyle}>
          <button 
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '10px'
            }}>
            Reset Display
          </button>
        </div>
      </div>

      {/* Middle Column with Two Canvases */}
      <div style={middleColumnStyle}>
        {/* Top Canvas Container */}
        <div ref={container1Ref} style={canvasContainerStyle}>
          <canvas 
            ref={canvas1Ref}
            style={canvasStyle}
          />
        </div>

        {/* Bottom Canvas Container */}
        <div ref={container2Ref} style={canvasContainerStyle}>
          <canvas 
            ref={canvas2Ref}
            style={canvasStyle}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div style={rightSidebarStyle}>
        <h2 style={titleStyle}>Display Info</h2>
        
        <div style={sectionStyle}>
          <div style={labelStyle}>DWBC High (Top)</div>
          <div style={valueStyle}>c2 on anti-diagonal</div>
          <div style={valueStyle}>b1 upper-left, b2 lower-right</div>
        </div>

        <hr style={{ borderColor: '#444', margin: '20px 0' }} />
        
        <div style={sectionStyle}>
          <div style={labelStyle}>DWBC Low (Bottom)</div>
          <div style={valueStyle}>c2 on main diagonal</div>
          <div style={valueStyle}>a1 upper-right, a2 lower-left</div>
        </div>

        <hr style={{ borderColor: '#444', margin: '20px 0' }} />

        <div style={sectionStyle}>
          <div style={labelStyle}>Canvas Dimensions</div>
          <div style={valueStyle}>
            {canvas1Ref.current ? `${canvas1Ref.current.width} × ${canvas1Ref.current.height}` : 'Initializing...'}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Rendering Mode</div>
          <div style={valueStyle}>Path Segments</div>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Color Scheme</div>
          <div style={valueStyle}>High: Cyan (#4ECDC4)</div>
          <div style={valueStyle}>Low: Pink (#F38181)</div>
        </div>
      </div>
    </div>
  );
};

export default TestDualLayout;