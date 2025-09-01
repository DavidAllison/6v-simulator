import React, { useEffect, useRef, useState } from 'react';
import { generateDWBCHigh, generateDWBCLow } from '../lib/six-vertex/initialStates';
import { OptimizedSimulation } from '../lib/six-vertex/optimizedSimulation';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { SimulationConfig } from '../lib/six-vertex/types';

const TestDualLayout: React.FC = () => {
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const container1Ref = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);
  
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ 
    sim1Steps: 0, 
    sim2Steps: 0,
    sim1FlipRate: 0,
    sim2FlipRate: 0 
  });
  
  // Refs for simulations and renderers
  const sim1Ref = useRef<OptimizedSimulation | null>(null);
  const sim2Ref = useRef<OptimizedSimulation | null>(null);
  const renderer1Ref = useRef<PathRenderer | null>(null);
  const renderer2Ref = useRef<PathRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Configuration for simulations
  const N = 24; // Lattice size
  const config: SimulationConfig = {
    N,
    weights: { a: 1, b: 1, c: 1 },
    algorithm: 'heat-bath',
    seed: 12345,
    batchSize: 100
  };

  // Initialize simulations
  const initializeSimulations = () => {
    // Clean up existing simulations
    if (sim1Ref.current) sim1Ref.current.destroy();
    if (sim2Ref.current) sim2Ref.current.destroy();
    
    // Create DWBC High simulation
    const highState = generateDWBCHigh(N);
    sim1Ref.current = new OptimizedSimulation(highState, config);
    
    // Create DWBC Low simulation
    const lowState = generateDWBCLow(N);
    sim2Ref.current = new OptimizedSimulation(lowState, config);
    
    // Reset stats
    setStats({ sim1Steps: 0, sim2Steps: 0, sim1FlipRate: 0, sim2FlipRate: 0 });
  };
  
  // Render a simulation to a canvas
  const renderSimulation = (
    canvas: HTMLCanvasElement, 
    renderer: PathRenderer, 
    simulation: OptimizedSimulation,
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
    renderer.render(simulation.getState());
    
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
      const ctx1 = canvas1Ref.current.getContext('2d');
      if (ctx1) {
        renderer1Ref.current = new PathRenderer(ctx1, {
          cellSize: 20,
          strokeWidth: 3,
          strokeColor: '#4ECDC4',
          showArrows: false,
          arrowSize: 4,
          arrowColor: '#666'
        });
        
        // Render initial state if simulation exists
        if (sim1Ref.current) {
          renderSimulation(canvas1Ref.current, renderer1Ref.current, sim1Ref.current, 'DWBC High');
        }
      }
    }

    if (container2Ref.current && canvas2Ref.current) {
      const rect = container2Ref.current.getBoundingClientRect();
      const width = Math.floor(rect.width - 40);
      const height = Math.floor(rect.height - 40);
      
      canvas2Ref.current.width = width;
      canvas2Ref.current.height = height;
      
      // Create renderer for canvas 2
      const ctx2 = canvas2Ref.current.getContext('2d');
      if (ctx2) {
        renderer2Ref.current = new PathRenderer(ctx2, {
          cellSize: 20,
          strokeWidth: 3,
          strokeColor: '#F38181',
          showArrows: false,
          arrowSize: 4,
          arrowColor: '#666'
        });
        
        // Render initial state if simulation exists
        if (sim2Ref.current) {
          renderSimulation(canvas2Ref.current, renderer2Ref.current, sim2Ref.current, 'DWBC Low');
        }
      }
    }
  };
  
  // Animation loop
  const animate = () => {
    if (!isRunning) return;
    
    // Step both simulations
    if (sim1Ref.current && renderer1Ref.current && canvas1Ref.current) {
      sim1Ref.current.step();
      renderSimulation(canvas1Ref.current, renderer1Ref.current, sim1Ref.current, 'DWBC High');
    }
    
    if (sim2Ref.current && renderer2Ref.current && canvas2Ref.current) {
      sim2Ref.current.step();
      renderSimulation(canvas2Ref.current, renderer2Ref.current, sim2Ref.current, 'DWBC Low');
    }
    
    // Update stats
    if (sim1Ref.current && sim2Ref.current) {
      const stats1 = sim1Ref.current.getStats();
      const stats2 = sim2Ref.current.getStats();
      setStats({
        sim1Steps: stats1.totalSteps,
        sim2Steps: stats2.totalSteps,
        sim1FlipRate: stats1.successRate,
        sim2FlipRate: stats2.successRate
      });
    }
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  
  // Handle start/stop
  const handleStartStop = () => {
    if (isRunning) {
      // Stop
      setIsRunning(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      // Start
      setIsRunning(true);
      animate();
    }
  };
  
  // Handle reset
  const handleReset = () => {
    setIsRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    initializeSimulations();
    resizeCanvases();
  };

  // Initialize on mount
  useEffect(() => {
    initializeSimulations();
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sim1Ref.current) sim1Ref.current.destroy();
      if (sim2Ref.current) sim2Ref.current.destroy();
    };
  }, []);
  
  // Handle running state changes
  useEffect(() => {
    if (isRunning) {
      animate();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning]);

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
          <div style={valueStyle}>{isRunning ? 'Running' : 'Paused'}</div>
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
            onClick={handleStartStop}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: isRunning ? '#ff9800' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
            {isRunning ? 'Pause Simulation' : 'Start Simulation'}
          </button>
        </div>

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
            Reset
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
        <h2 style={titleStyle}>Statistics</h2>
        
        <div style={sectionStyle}>
          <div style={labelStyle}>DWBC High (Top)</div>
          <div style={valueStyle}>Steps: {stats.sim1Steps.toLocaleString()}</div>
        </div>
        
        <div style={sectionStyle}>
          <div style={labelStyle}>High Flip Rate</div>
          <div style={valueStyle}>
            {(stats.sim1FlipRate * 100).toFixed(1)}%
          </div>
        </div>

        <hr style={{ borderColor: '#444', margin: '20px 0' }} />
        
        <div style={sectionStyle}>
          <div style={labelStyle}>DWBC Low (Bottom)</div>
          <div style={valueStyle}>Steps: {stats.sim2Steps.toLocaleString()}</div>
        </div>
        
        <div style={sectionStyle}>
          <div style={labelStyle}>Low Flip Rate</div>
          <div style={valueStyle}>
            {(stats.sim2FlipRate * 100).toFixed(1)}%
          </div>
        </div>

        <hr style={{ borderColor: '#444', margin: '20px 0' }} />

        <div style={sectionStyle}>
          <div style={labelStyle}>Canvas Dimensions</div>
          <div style={valueStyle}>
            {canvas1Ref.current ? `${canvas1Ref.current.width} × ${canvas1Ref.current.height}` : 'Initializing...'}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Algorithm</div>
          <div style={valueStyle}>Heat Bath</div>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Batch Size</div>
          <div style={valueStyle}>{config.batchSize} steps/frame</div>
        </div>
      </div>
    </div>
  );
};

export default TestDualLayout;