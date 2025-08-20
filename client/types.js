/**
 * Core type definitions for the 6-vertex model simulator
 * Based on the square ice model with vertex configurations
 */
/**
 * Vertex types based on the 6 allowed ice configurations
 * Named according to the paper conventions:
 * - a1, a2: Source/sink configurations (2 in, 2 out or vice versa)
 * - b1, b2: Straight-through configurations (horizontal or vertical flow)
 * - c1, c2: Turn configurations (flow changes direction)
 */
export const VertexType = {
    a1: 'a1', // In: left, top    | Out: right, bottom
    a2: 'a2', // In: right, bottom | Out: left, top
    b1: 'b1', // In: left, right   | Out: top, bottom
    b2: 'b2', // In: top, bottom   | Out: left, right
    c1: 'c1', // In: left, bottom  | Out: right, top
    c2: 'c2', // In: right, top    | Out: left, bottom
};
/**
 * Edge direction relative to a vertex
 */
export const EdgeDirection = {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
};
/**
 * Edge state (arrow direction on the edge)
 * For horizontal edges: In = left-to-right, Out = right-to-left
 * For vertical edges: In = top-to-bottom, Out = bottom-to-top
 */
export const EdgeState = {
    In: 'in',
    Out: 'out',
};
/**
 * Boundary conditions for the lattice
 */
export const BoundaryCondition = {
    Periodic: 'periodic', // Toroidal topology
    Fixed: 'fixed', // Fixed boundary arrows
    Open: 'open', // Open boundaries
    DWBC: 'dwbc', // Domain Wall Boundary Conditions
};
/**
 * Rendering modes for visualization
 */
export const RenderMode = {
    Paths: 'paths', // Show bold edges forming paths
    Arrows: 'arrows', // Show arrow directions on edges
    Both: 'both', // Show both paths and arrows
    Vertices: 'vertices', // Color-code vertex types
};
/**
 * Type guard to check if a configuration represents a valid vertex type
 */
export function getVertexType(config) {
    const { left, right, top, bottom } = config;
    // Count ins and outs
    const ins = [left, right, top, bottom].filter((e) => e === EdgeState.In).length;
    const outs = [left, right, top, bottom].filter((e) => e === EdgeState.Out).length;
    // Ice rule: must have 2 ins and 2 outs
    if (ins !== 2 || outs !== 2) {
        return null;
    }
    // Determine vertex type based on configuration
    if (left === EdgeState.In && top === EdgeState.In)
        return VertexType.a1;
    if (right === EdgeState.In && bottom === EdgeState.In)
        return VertexType.a2;
    if (left === EdgeState.In && right === EdgeState.In)
        return VertexType.b1;
    if (top === EdgeState.In && bottom === EdgeState.In)
        return VertexType.b2;
    if (left === EdgeState.In && bottom === EdgeState.In)
        return VertexType.c1;
    if (right === EdgeState.In && top === EdgeState.In)
        return VertexType.c2;
    return null;
}
/**
 * Get vertex configuration from vertex type
 */
export function getVertexConfiguration(type) {
    switch (type) {
        case VertexType.a1:
            return {
                left: EdgeState.In,
                top: EdgeState.In,
                right: EdgeState.Out,
                bottom: EdgeState.Out,
            };
        case VertexType.a2:
            return {
                right: EdgeState.In,
                bottom: EdgeState.In,
                left: EdgeState.Out,
                top: EdgeState.Out,
            };
        case VertexType.b1:
            return {
                left: EdgeState.In,
                right: EdgeState.In,
                top: EdgeState.Out,
                bottom: EdgeState.Out,
            };
        case VertexType.b2:
            return {
                top: EdgeState.In,
                bottom: EdgeState.In,
                left: EdgeState.Out,
                right: EdgeState.Out,
            };
        case VertexType.c1:
            return {
                left: EdgeState.In,
                bottom: EdgeState.In,
                right: EdgeState.Out,
                top: EdgeState.Out,
            };
        case VertexType.c2:
            return {
                right: EdgeState.In,
                top: EdgeState.In,
                left: EdgeState.Out,
                bottom: EdgeState.Out,
            };
    }
}
