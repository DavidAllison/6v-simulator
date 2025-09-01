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
  
  // Refs for states
  const state1Ref = useRef<LatticeState | null>(null);
  const state2Ref = useRef<LatticeState | null>(null);
  
  // Configuration for simulations
  const N = 16; // Smaller lattice size for better performance and visibility

  // Initialize states
  const initializeStates = () => {
    // Create DWBC High state
    state1Ref.current = generateDWBCHigh(N);
    console.log('Generated DWBC High state:', state1Ref.current);
    
    // Create DWBC Low state
    state2Ref.current = generateDWBCLow(N);
    console.log('Generated DWBC Low state:', state2Ref.current);
  };
  
  // Render a state to a canvas
  const renderState = (
    canvas: HTMLCanvasElement, 
    state: LatticeState,
    label: string,
    pathColor: string
  ) => {
    console.log(`Rendering ${label}:`, {
      canvasSize: { width: canvas.width, height: canvas.height },
      stateSize: { width: state.width, height: state.height },
      pathColor
    });
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scale to fit canvas with padding
    const padding = 60;
    const cellSize = 20;
    const availableWidth = canvas.width - (2 * padding);
    const availableHeight = canvas.height - (2 * padding);
    
    // Create a temporary canvas for the PathRenderer
    // Don't set size - PathRenderer will do it based on lattice
    const tempCanvas = document.createElement('canvas');
    
    // Create PathRenderer with the temporary canvas
    const renderer = new PathRenderer(tempCanvas, {
      cellSize: cellSize,
      lineWidth: 3,
      colors: {
        background: '#1a1a1a', // Use dark background instead of transparent
        grid: '#333',
        pathSegment: pathColor,
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
    
    // Render to temporary canvas
    renderer.render(state);
    
    // Now get the actual dimensions after PathRenderer sets them
    const matrixWidth = tempCanvas.width;
    const matrixHeight = tempCanvas.height;
    
    // Calculate scale to fit
    const scale = Math.min(
      availableWidth / matrixWidth,
      availableHeight / matrixHeight,
      2 // Max scale of 2x to avoid pixelation
    );
    
    // Calculate actual dimensions and center position
    const scaledWidth = matrixWidth * scale;
    const scaledHeight = matrixHeight * scale;
    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;
    
    // Log temp canvas details for debugging
    console.log(`Temp canvas rendered for ${label}:`, {
      tempCanvasSize: { width: tempCanvas.width, height: tempCanvas.height },
      scale: scale,
      offset: { x: offsetX, y: offsetY },
      hasContent: tempCanvas.getContext('2d')?.getImageData(0, 0, 1, 1).data.some(v => v > 0)
    });
    
    // Draw the rendered matrix to our main canvas with scaling
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Crisp pixels
    
    // Draw the temp canvas to the main canvas
    try {
      ctx.drawImage(
        tempCanvas,
        0, 0, matrixWidth, matrixHeight,
        offsetX, offsetY, scaledWidth, scaledHeight
      );
      console.log(`Successfully drew ${label} to main canvas`);
    } catch (error) {
      console.error(`Error drawing ${label}:`, error);
    }
    
    ctx.restore();
    
    // Add label overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, 10, 10);
    
    // Add matrix info
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`Size: ${state.width}×${state.height}`, 10, 32);
    ctx.fillText(`Scale: ${scale.toFixed(2)}x`, 10, 48);
    
    // Add subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  };

  // Resize canvases and render states
  const resizeCanvases = () => {
    if (container1Ref.current && canvas1Ref.current) {
      const rect = container1Ref.current.getBoundingClientRect();
      const width = Math.floor(rect.width - 40);
      const height = Math.floor(rect.height - 40);
      
      canvas1Ref.current.width = width;
      canvas1Ref.current.height = height;
      
      // Render DWBC High state if it exists
      if (state1Ref.current) {
        renderState(canvas1Ref.current, state1Ref.current, 'DWBC High', '#4ECDC4');
      }
    }

    if (container2Ref.current && canvas2Ref.current) {
      const rect = container2Ref.current.getBoundingClientRect();
      const width = Math.floor(rect.width - 40);
      const height = Math.floor(rect.height - 40);
      
      canvas2Ref.current.width = width;
      canvas2Ref.current.height = height;
      
      // Render DWBC Low state if it exists
      if (state2Ref.current) {
        renderState(canvas2Ref.current, state2Ref.current, 'DWBC Low', '#F38181');
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