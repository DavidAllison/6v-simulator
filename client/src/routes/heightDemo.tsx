/**
 * Demo route to visualize the height function
 */

import React, { useState, useEffect, useCallback } from 'react';
import { generateDWBCState } from '../lib/six-vertex/initialStates';
import { calculateHeightFunction, type HeightData } from '../lib/six-vertex/heightFunction';
import type { LatticeState, DWBCConfig } from '../lib/six-vertex/types';
import '../App.css';

export function HeightDemo() {
  const [size, setSize] = useState(8);
  const [dwbcType, setDwbcType] = useState<'high' | 'low'>('high');
  const [lattice, setLattice] = useState<LatticeState | null>(null);
  const [heightData, setHeightData] = useState<HeightData | null>(null);
  const [showValues, setShowValues] = useState(true);
  const [colorScale, setColorScale] = useState<'blue' | 'heat' | 'grayscale'>('heat');

  // Generate lattice and calculate heights
  const generateLattice = useCallback(() => {
    const config: DWBCConfig = { type: dwbcType };
    const newLattice = generateDWBCState(size, size, config);
    setLattice(newLattice);
    
    const heights = calculateHeightFunction(newLattice);
    setHeightData(heights);
  }, [size, dwbcType]);

  useEffect(() => {
    generateLattice();
  }, [generateLattice]);

  // Get color for height value
  const getHeightColor = (height: number, min: number, max: number): string => {
    const normalized = max > min ? (height - min) / (max - min) : 0;
    
    switch (colorScale) {
      case 'blue': {
        const blue = Math.floor(255 * normalized);
        const red = Math.floor(255 * (1 - normalized));
        return `rgb(${red}, ${red}, ${blue})`;
      }
      
      case 'heat': {
        // Heat map: blue -> green -> yellow -> red
        if (normalized < 0.25) {
          const t = normalized * 4;
          return `rgb(0, ${Math.floor(t * 255)}, ${Math.floor(255 * (1 - t))})`;
        } else if (normalized < 0.5) {
          const t = (normalized - 0.25) * 4;
          return `rgb(${Math.floor(t * 255)}, 255, 0)`;
        } else if (normalized < 0.75) {
          const t = (normalized - 0.5) * 4;
          return `rgb(255, ${Math.floor(255 * (1 - t))}, 0)`;
        } else {
          const t = (normalized - 0.75) * 4;
          return `rgb(255, 0, ${Math.floor(t * 128)})`;
        }
      }
      
      case 'grayscale':
      default: {
        const gray = Math.floor(255 * normalized);
        return `rgb(${gray}, ${gray}, ${gray})`;
      }
    }
  };

  if (!lattice || !heightData) {
    return <div className="height-demo">Loading...</div>;
  }

  const cellSize = Math.min(600 / size, 60);

  return (
    <div className="height-demo" style={{ padding: '20px' }}>
      <h1>Height Function Visualization</h1>
      
      <div className="controls" style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Size: 
            <input
              type="range"
              min="4"
              max="24"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ marginLeft: '10px', marginRight: '10px' }}
            />
            {size}×{size}
          </label>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '20px' }}>
            <input
              type="radio"
              value="high"
              checked={dwbcType === 'high'}
              onChange={() => setDwbcType('high')}
            />
            DWBC High
          </label>
          <label>
            <input
              type="radio"
              value="low"
              checked={dwbcType === 'low'}
              onChange={() => setDwbcType('low')}
            />
            DWBC Low
          </label>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '20px' }}>
            Color Scale:
            <select
              value={colorScale}
              onChange={(e) => setColorScale(e.target.value as 'blue' | 'heat' | 'grayscale')}
              style={{ marginLeft: '10px' }}
            >
              <option value="heat">Heat Map</option>
              <option value="blue">Blue Scale</option>
              <option value="grayscale">Grayscale</option>
            </select>
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={showValues}
              onChange={(e) => setShowValues(e.target.checked)}
            />
            Show Values
          </label>
        </div>
        
        <button onClick={generateLattice} style={{ padding: '5px 15px' }}>
          Regenerate
        </button>
      </div>
      
      <div className="stats" style={{ marginBottom: '20px' }}>
        <h3>Statistics</h3>
        <p>Total Volume: {heightData.totalVolume.toFixed(2)}</p>
        <p>Average Height: {heightData.averageHeight.toFixed(3)}</p>
        <p>Min Height: {heightData.minHeight}</p>
        <p>Max Height: {heightData.maxHeight}</p>
        <p>Range: {heightData.maxHeight - heightData.minHeight}</p>
      </div>
      
      <div className="height-grid" style={{ display: 'inline-block' }}>
        <h3>Height Function Heatmap</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
            gap: '1px',
            backgroundColor: '#e0e0e0',
            padding: '1px',
            border: '2px solid #333',
          }}
        >
          {heightData.heights.map((row, rowIdx) =>
            row.map((height, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: getHeightColor(height, heightData.minHeight, heightData.maxHeight),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: cellSize > 30 && showValues ? `${Math.min(cellSize / 3, 14)}px` : '0',
                  color: showValues ? '#fff' : 'transparent',
                  fontWeight: 'bold',
                  textShadow: showValues ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                title={`Position (${rowIdx},${colIdx}): Height = ${height}`}
              >
                {showValues && cellSize > 30 ? height : ''}
              </div>
            ))
          )}
        </div>
        
        {/* Color scale legend */}
        <div style={{ marginTop: '20px' }}>
          <h4>Color Scale</h4>
          <div
            style={{
              width: '300px',
              height: '30px',
              background: `linear-gradient(to right, ${
                Array.from({ length: 20 }, (_, i) => {
                  const normalized = i / 19;
                  const value = heightData.minHeight + normalized * (heightData.maxHeight - heightData.minHeight);
                  return getHeightColor(value, heightData.minHeight, heightData.maxHeight);
                }).join(', ')
              })`,
              border: '1px solid #333',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px' }}>
            <span>{heightData.minHeight}</span>
            <span>{((heightData.minHeight + heightData.maxHeight) / 2).toFixed(1)}</span>
            <span>{heightData.maxHeight}</span>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h3>About the Height Function</h3>
        <p style={{ maxWidth: '600px', lineHeight: '1.6' }}>
          The height function is a fundamental concept in the 6-vertex model. 
          It is calculated by counting specific edge crossings when traveling from the origin (0,0) to each vertex.
          Specifically:
        </p>
        <ul style={{ maxWidth: '600px', lineHeight: '1.6' }}>
          <li>When an edge points LEFT into a vertex, the height increases by +1</li>
          <li>When an edge points DOWN into a vertex, the height increases by +1</li>
          <li>The total volume is the sum of all vertex heights</li>
          <li>The height function provides insight into the macroscopic properties of the system</li>
        </ul>
        <p style={{ maxWidth: '600px', lineHeight: '1.6' }}>
          In DWBC (Domain Wall Boundary Conditions), the height function exhibits characteristic patterns
          that differ between the "high" and "low" configurations, reflecting the underlying vertex arrangements.
        </p>
      </div>
    </div>
  );
}