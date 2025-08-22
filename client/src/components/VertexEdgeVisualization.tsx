/**
 * Visual representation of vertex types showing bold/shaded edge patterns
 * Based on Figure 1 from the paper
 */

import React from 'react';
import { VertexType } from '../lib/six-vertex/types';

interface VertexEdgeVisualizationProps {
  vertexType: VertexType;
  size?: number;
  showArrows?: boolean;
  showLabel?: boolean;
}

/**
 * Edge patterns from the paper's Figure 1:
 * - a1: Bold edges LEFT→CENTER and TOP→CENTER (forms ┐ shape)
 * - a2: Bold edges CENTER→RIGHT and CENTER→BOTTOM (forms └ shape)
 * - b1: Bold edges LEFT→RIGHT (horizontal line through)
 * - b2: Bold edges TOP→BOTTOM (vertical line through)
 * - c1: Bold edges LEFT→CENTER and CENTER→BOTTOM (forms ┘ shape)
 * - c2: Bold edges TOP→CENTER and CENTER→RIGHT (forms ┌ shape)
 */
export const VertexEdgeVisualization: React.FC<VertexEdgeVisualizationProps> = ({
  vertexType,
  size = 60,
  showArrows = false,
  showLabel = false,
}) => {
  const strokeWidth = 2;
  const boldStrokeWidth = 5;
  const arrowSize = 8;
  const center = size / 2;
  const padding = 5;

  // Arrow configurations for each vertex type
  // true = arrow points IN to vertex center, false = arrow points OUT from vertex center
  const arrowConfigs = {
    [VertexType.a1]: { left: true, right: false, top: true, bottom: false },
    [VertexType.a2]: { left: false, right: true, top: false, bottom: true },
    [VertexType.b1]: { left: true, right: true, top: false, bottom: false },
    [VertexType.b2]: { left: false, right: false, top: true, bottom: true },
    [VertexType.c1]: { left: true, right: false, top: false, bottom: true },
    [VertexType.c2]: { left: false, right: true, top: true, bottom: false },
  };

  const config = arrowConfigs[vertexType];

  // Render arrow marker
  const renderArrow = (x1: number, y1: number, x2: number, y2: number, pointsIn: boolean) => {
    if (!showArrows) return null;

    // Calculate arrow position (at midpoint of edge)
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Calculate arrow direction
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowAngle = pointsIn ? angle : angle + Math.PI;

    const tipX = midX + (Math.cos(arrowAngle) * arrowSize) / 2;
    const tipY = midY + (Math.sin(arrowAngle) * arrowSize) / 2;
    const baseAngle1 = arrowAngle + 2.5;
    const baseAngle2 = arrowAngle - 2.5;

    return (
      <polygon
        points={`
          ${tipX},${tipY}
          ${tipX - Math.cos(baseAngle1) * arrowSize},${tipY - Math.sin(baseAngle1) * arrowSize}
          ${tipX - Math.cos(baseAngle2) * arrowSize},${tipY - Math.sin(baseAngle2) * arrowSize}
        `}
        fill="#333"
      />
    );
  };

  // Determine which edges are bold based on vertex type
  // From paper Figure 1: bold edges show where paths pass through
  const getBoldEdges = () => {
    switch (vertexType) {
      case VertexType.a1:
        // ALL edges bold: Two straight paths (horizontal AND vertical)
        return { left: true, right: true, top: true, bottom: true };
      case VertexType.a2:
        // NO edges bold: Paths are reversed/thin in paper notation
        return { left: false, right: false, top: false, bottom: false };
      case VertexType.b1:
        // Vertical edges bold: One vertical path (top→bottom)
        return { left: false, right: false, top: true, bottom: true };
      case VertexType.b2:
        // Horizontal edges bold: One horizontal path (left→right)
        return { left: true, right: true, top: false, bottom: false };
      case VertexType.c1:
        // Left and bottom edges bold: L-shaped path (left→bottom)
        return { left: true, right: false, top: false, bottom: true };
      case VertexType.c2:
        // Top and right edges bold: L-shaped path (top→right)
        return { left: false, right: true, top: true, bottom: false };
      default:
        return { left: false, right: false, top: false, bottom: false };
    }
  };

  const boldEdges = getBoldEdges();

  // Vertex type colors
  const vertexColors = {
    [VertexType.a1]: '#ff6b6b',
    [VertexType.a2]: '#4ecdc4',
    [VertexType.b1]: '#45b7d1',
    [VertexType.b2]: '#96ceb4',
    [VertexType.c1]: '#ffd93d',
    [VertexType.c2]: '#c9a0ff',
  };

  return (
    <div style={{ display: 'inline-block', margin: '5px' }}>
      <svg width={size} height={size} style={{ border: '1px solid #ddd' }}>
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill={vertexColors[vertexType]}
          opacity={0.2}
        />

        {/* Center vertex point */}
        <circle cx={center} cy={center} r={4} fill="#333" />

        {/* Left edge */}
        <line
          x1={padding}
          y1={center}
          x2={center - 4}
          y2={center}
          stroke={boldEdges.left ? '#333' : '#999'}
          strokeWidth={boldEdges.left ? boldStrokeWidth : strokeWidth}
          strokeLinecap="round"
        />
        {renderArrow(padding, center, center, center, config.left)}

        {/* Right edge */}
        <line
          x1={center + 4}
          y1={center}
          x2={size - padding}
          y2={center}
          stroke={boldEdges.right ? '#333' : '#999'}
          strokeWidth={boldEdges.right ? boldStrokeWidth : strokeWidth}
          strokeLinecap="round"
        />
        {renderArrow(center, center, size - padding, center, config.right)}

        {/* Top edge */}
        <line
          x1={center}
          y1={padding}
          x2={center}
          y2={center - 4}
          stroke={boldEdges.top ? '#333' : '#999'}
          strokeWidth={boldEdges.top ? boldStrokeWidth : strokeWidth}
          strokeLinecap="round"
        />
        {renderArrow(center, padding, center, center, config.top)}

        {/* Bottom edge */}
        <line
          x1={center}
          y1={center + 4}
          x2={center}
          y2={size - padding}
          stroke={boldEdges.bottom ? '#333' : '#999'}
          strokeWidth={boldEdges.bottom ? boldStrokeWidth : strokeWidth}
          strokeLinecap="round"
        />
        {renderArrow(center, center, center, size - padding, config.bottom)}
      </svg>
      {showLabel && (
        <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '2px' }}>{vertexType}</div>
      )}
    </div>
  );
};

// Edge patterns for each vertex type (which edges have bold segments/paths passing through)
// Based on paper Figure 1: edges are shaded where paths flow through them
// const edgePatterns = {
//   a1: { left: true, top: true, right: true, bottom: true }, // All edges (2 straight paths)
//   a2: { left: false, top: false, right: false, bottom: false }, // No edges shaded
//   b1: { left: false, top: true, right: false, bottom: true }, // Vertical path only
//   b2: { left: true, top: false, right: true, bottom: false }, // Horizontal path only
//   c1: { left: true, top: false, right: false, bottom: true }, // L-shaped: left→bottom
//   c2: { left: false, top: true, right: true, bottom: false }, // L-shaped: top→right
// };

/**
 * Legend showing all vertex types with their edge patterns
 */
export const VertexLegend: React.FC<{ showArrows?: boolean }> = ({ showArrows = false }) => {
  const vertexTypes = [
    VertexType.a1,
    VertexType.a2,
    VertexType.b1,
    VertexType.b2,
    VertexType.c1,
    VertexType.c2,
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px' }}>
      {vertexTypes.map((type) => (
        <VertexEdgeVisualization
          key={type}
          vertexType={type}
          size={50}
          showArrows={showArrows}
          showLabel={true}
        />
      ))}
    </div>
  );
};

/**
 * Display a 2x2 plaquette with edge visualizations
 */
export const PlaquetteVisualization: React.FC<{
  vertices: [VertexType, VertexType, VertexType, VertexType];
  highlightEdges?: boolean;
}> = ({ vertices }) => {
  const [bottomLeft, bottomRight, topRight, topLeft] = vertices;
  const cellSize = 60;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0' }}>
      <div style={{ gridRow: 1, gridColumn: 1 }}>
        <VertexEdgeVisualization vertexType={topLeft} size={cellSize} showLabel={true} />
      </div>
      <div style={{ gridRow: 1, gridColumn: 2 }}>
        <VertexEdgeVisualization vertexType={topRight} size={cellSize} showLabel={true} />
      </div>
      <div style={{ gridRow: 2, gridColumn: 1 }}>
        <VertexEdgeVisualization vertexType={bottomLeft} size={cellSize} showLabel={true} />
      </div>
      <div style={{ gridRow: 2, gridColumn: 2 }}>
        <VertexEdgeVisualization vertexType={bottomRight} size={cellSize} showLabel={true} />
      </div>
    </div>
  );
};
