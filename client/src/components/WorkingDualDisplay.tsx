import React, { useEffect, useRef } from 'react';
import { generateDWBCHigh, generateDWBCLow } from '../lib/six-vertex/initialStates';
import { VertexType } from '../lib/six-vertex/types';
import './DualSimulationDisplay.css';

const MATRIX_SIZE = 24;
const CELL_SIZE = 20;
const CANVAS_SIZE = MATRIX_SIZE * CELL_SIZE;

// Vertex type colors for clear visibility
const VERTEX_COLORS: Record<VertexType, string> = {
  [VertexType.a1]: '#FF0000',  // Red
  [VertexType.a2]: '#00FF00',  // Green
  [VertexType.b1]: '#0000FF',  // Blue
  [VertexType.b2]: '#FFFF00',  // Yellow
  [VertexType.c1]: '#FF00FF',  // Magenta
  [VertexType.c2]: '#00FFFF',  // Cyan
};

const WorkingDualDisplay: React.FC = () => {
  const highCanvasRef = useRef<HTMLCanvasElement>(null);
  const lowCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderMatrix = (canvas: HTMLCanvasElement, latticeState: ReturnType<typeof generateDWBCHigh>) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid lines for clarity
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= MATRIX_SIZE; i++) {
      const pos = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
      ctx.stroke();
    }

    // Draw vertex cells
    for (let i = 0; i < MATRIX_SIZE; i++) {
      for (let j = 0; j < MATRIX_SIZE; j++) {
        const vertex = latticeState.vertices[i][j];
        const vertexType = vertex.type;
        const x = j * CELL_SIZE;
        const y = i * CELL_SIZE;

        // Fill cell with vertex color
        ctx.fillStyle = VERTEX_COLORS[vertexType];
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // Add vertex type label
        ctx.fillStyle = 'black';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = vertexType;
        ctx.fillText(label, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
      }
    }
  };

  useEffect(() => {
    // Generate initial states
    const highMatrix = generateDWBCHigh(MATRIX_SIZE);
    const lowMatrix = generateDWBCLow(MATRIX_SIZE);

    // Render both matrices
    if (highCanvasRef.current) {
      renderMatrix(highCanvasRef.current, highMatrix);
    }
    if (lowCanvasRef.current) {
      renderMatrix(lowCanvasRef.current, lowMatrix);
    }
  }, []);

  return (
    <div className="dual-simulation-container">
      <div className="dual-simulation-layout">
        {/* Left panel - DWBC High */}
        <div className="simulation-panel">
          <div className="panel-header">
            <h3>DWBC High</h3>
            <p>Initial configuration with c₂ on anti-diagonal</p>
          </div>
          <div className="canvas-wrapper">
            <canvas
              ref={highCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{
                border: '2px solid #333',
                backgroundColor: 'white',
                display: 'block',
                imageRendering: 'pixelated'
              }}
            />
          </div>
          <div className="legend">
            <h4>Vertex Types:</h4>
            <div className="legend-items">
              {Object.entries(VERTEX_COLORS).map(([type, color]) => (
                <div key={type} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ 
                      backgroundColor: color,
                      width: '20px',
                      height: '20px',
                      border: '1px solid #333',
                      display: 'inline-block',
                      marginRight: '8px'
                    }} 
                  />
                  <span>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle separator */}
        <div className="panel-separator" />

        {/* Right panel - DWBC Low */}
        <div className="simulation-panel">
          <div className="panel-header">
            <h3>DWBC Low</h3>
            <p>Initial configuration with c₂ on main diagonal</p>
          </div>
          <div className="canvas-wrapper">
            <canvas
              ref={lowCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{
                border: '2px solid #333',
                backgroundColor: 'white',
                display: 'block',
                imageRendering: 'pixelated'
              }}
            />
          </div>
          <div className="legend">
            <h4>Matrix Regions:</h4>
            <div className="region-info">
              <p><strong>High:</strong> Vertical-dominant (upper-left), Horizontal-dominant (lower-right)</p>
              <p><strong>Low:</strong> a₁ region (upper-right), a₂ region (lower-left)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with controls */}
      <div className="controls-footer">
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Regenerate Matrices
        </button>
        <p style={{ marginTop: '10px', color: '#666' }}>
          Matrix Size: {MATRIX_SIZE}×{MATRIX_SIZE} | Cell Size: {CELL_SIZE}px
        </p>
      </div>
    </div>
  );
};

export default WorkingDualDisplay;