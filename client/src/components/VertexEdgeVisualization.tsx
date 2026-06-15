/**
 * Visual representation of vertex types showing bold/shaded edge patterns
 * Based on Figure 1 from the paper
 */

import React from 'react';
import { VertexType, EdgeState, getVertexConfiguration } from '../lib/six-vertex/types';
import type { EdgeDirection } from '../lib/six-vertex/types';
import { getPathSegments } from '../lib/six-vertex/vertexShapes';
import { getCurrentVertexColors } from '../lib/six-vertex/themeColors';
import { useTheme } from '../hooks/useTheme';

interface VertexEdgeVisualizationProps {
  vertexType: VertexType;
  size?: number;
  showArrows?: boolean;
  showLabel?: boolean;
}

type EdgeFlags = { left: boolean; right: boolean; top: boolean; bottom: boolean };

/**
 * Which edges are bold for a vertex type, derived from `getPathSegments` —
 * the SAME source of truth the lattice canvas uses. Each path segment touches
 * two edges; both of those edges are drawn bold. This guarantees the legend can
 * never disagree with the rendered lattice.
 *
 * Canonical counts (verified against getPathSegments):
 * - a1: 2 segments (L–R and T–B) → all four edges bold
 * - a2: 0 segments → no bold edges
 * - b1: 1 segment (T–B) → vertical edges bold
 * - b2: 1 segment (L–R) → horizontal edges bold
 * - c1: 1 segment (L–B) → left + bottom bold
 * - c2: 1 segment (T–R) → top + right bold
 */
const getBoldEdgesForType = (vertexType: VertexType): EdgeFlags => {
  const flags: EdgeFlags = { left: false, right: false, top: false, bottom: false };
  for (const segment of getPathSegments(vertexType)) {
    flags[segment.from as EdgeDirection] = true;
    flags[segment.to as EdgeDirection] = true;
  }
  return flags;
};

/**
 * Arrow directions for a vertex type, derived from `getVertexConfiguration` —
 * the canonical 2-in / 2-out ice configuration. `true` = arrow points IN toward
 * the vertex center, `false` = points OUT.
 */
const getArrowConfigForType = (vertexType: VertexType): EdgeFlags => {
  const config = getVertexConfiguration(vertexType);
  return {
    left: config.left === EdgeState.In,
    right: config.right === EdgeState.In,
    top: config.top === EdgeState.In,
    bottom: config.bottom === EdgeState.In,
  };
};

export const VertexEdgeVisualization: React.FC<VertexEdgeVisualizationProps> = ({
  vertexType,
  size = 60,
  showArrows = false,
  showLabel = false,
}) => {
  // Subscribe to the theme so the diagram (and its vertex palette) re-renders
  // when light/dark mode toggles.
  useTheme();

  const strokeWidth = 2;
  const boldStrokeWidth = 5;
  const arrowSize = 8;
  const center = size / 2;
  const padding = 5;

  // Arrow directions derived from the canonical ice configuration.
  const config = getArrowConfigForType(vertexType);

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
        fill="var(--color-text-primary)"
      />
    );
  };

  // Which edges are bold — derived from the canvas's source of truth so the
  // legend and the lattice can never disagree.
  const boldEdges = getBoldEdgesForType(vertexType);

  // Canonical, theme-aware vertex palette shared with the Canvas renderer and
  // the ControlPanel/StatisticsPanel legends (single source of truth).
  const vertexColors = getCurrentVertexColors();

  // Theme tokens for the diagram chrome (bold/thin edges, center point, border).
  const boldEdgeColor = 'var(--color-text-primary)';
  const thinEdgeColor = 'var(--color-text-muted)';

  return (
    <div style={{ display: 'inline-block', margin: 'var(--spacing-xs)' }}>
      <svg width={size} height={size} style={{ border: '1px solid var(--color-border)' }}>
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
        <circle cx={center} cy={center} r={4} fill={boldEdgeColor} />

        {/* Left edge */}
        <line
          x1={padding}
          y1={center}
          x2={center - 4}
          y2={center}
          stroke={boldEdges.left ? boldEdgeColor : thinEdgeColor}
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
          stroke={boldEdges.right ? boldEdgeColor : thinEdgeColor}
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
          stroke={boldEdges.top ? boldEdgeColor : thinEdgeColor}
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
          stroke={boldEdges.bottom ? boldEdgeColor : thinEdgeColor}
          strokeWidth={boldEdges.bottom ? boldStrokeWidth : strokeWidth}
          strokeLinecap="round"
        />
        {renderArrow(center, center, center, size - padding, config.bottom)}
      </svg>
      {showLabel && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-primary)',
            marginTop: '2px',
          }}
        >
          {vertexType}
        </div>
      )}
    </div>
  );
};

/**
 * Display name (with proper subscript) and one-line plain-language role for each
 * vertex type. The roles describe what the bold path looks like at that junction.
 */
const VERTEX_INFO: Record<VertexType, { name: string; role: string }> = {
  [VertexType.a1]: { name: 'a₁', role: 'Both paths cross (horizontal + vertical).' },
  [VertexType.a2]: { name: 'a₂', role: 'Empty — no path drawn here.' },
  [VertexType.b1]: { name: 'b₁', role: 'One vertical path (top ↔ bottom).' },
  [VertexType.b2]: { name: 'b₂', role: 'One horizontal path (left ↔ right).' },
  [VertexType.c1]: { name: 'c₁', role: 'A turn (left ↔ bottom).' },
  [VertexType.c2]: {
    name: 'c₂',
    role: 'A turn (top ↔ right) — the c-vertices trace the Arctic-circle boundary.',
  },
};

const LEGEND_VERTEX_TYPES: VertexType[] = [
  VertexType.a1,
  VertexType.a2,
  VertexType.b1,
  VertexType.b2,
  VertexType.c1,
  VertexType.c2,
];

/**
 * Teaching legend: every one of the six vertex types with its name (subscript),
 * arrow diagram, bold-path shape, color swatch, and a one-line plain-language role.
 */
export const VertexLegend: React.FC<{ showArrows?: boolean }> = ({ showArrows = true }) => {
  // Subscribe to the theme so swatch colors track light/dark mode.
  useTheme();
  const vertexColors = getCurrentVertexColors();

  return (
    <div className="vertex-legend-grid">
      {LEGEND_VERTEX_TYPES.map((type) => {
        const info = VERTEX_INFO[type];
        return (
          <div className="vertex-legend-card" key={type}>
            <VertexEdgeVisualization vertexType={type} size={56} showArrows={showArrows} />
            <div className="vertex-legend-text">
              <div className="vertex-legend-name">
                <span
                  className="vertex-legend-swatch"
                  style={{ backgroundColor: vertexColors[type] }}
                  aria-hidden="true"
                />
                {info.name}
              </div>
              <div className="vertex-legend-role">{info.role}</div>
            </div>
          </div>
        );
      })}
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
