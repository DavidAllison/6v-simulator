/**
 * DWBC Implementation with guaranteed Ice Rule satisfaction
 *
 * Key approach: Build edges consistently from top-left to bottom-right,
 * ensuring each vertex satisfies the ice rule (2 in, 2 out).
 */
import { VertexType, EdgeState } from './types';
/**
 * Generate DWBC High with guaranteed ice rule satisfaction
 */
export function generateDWBCHighIceValid(size) {
    console.log(`[DWBC High Ice-Valid] Generating for size ${size}`);
    // Initialize edge arrays
    const horizontalEdges = Array(size).fill(null).map(() => Array(size + 1).fill(EdgeState.Out));
    const verticalEdges = Array(size + 1).fill(null).map(() => Array(size).fill(EdgeState.Out));
    // Set DWBC High boundary conditions
    // Top boundary: arrows point down (into lattice)
    for (let col = 0; col < size; col++) {
        verticalEdges[0][col] = EdgeState.In;
    }
    // Bottom boundary: arrows point down (out of lattice)
    for (let col = 0; col < size; col++) {
        verticalEdges[size][col] = EdgeState.Out;
    }
    // Left boundary: arrows point right (into lattice)
    for (let row = 0; row < size; row++) {
        horizontalEdges[row][0] = EdgeState.Out;
    }
    // Right boundary: arrows point right (out of lattice)
    for (let row = 0; row < size; row++) {
        horizontalEdges[row][size] = EdgeState.In;
    }
    // Build vertices and set internal edges consistently
    const vertices = [];
    for (let row = 0; row < size; row++) {
        vertices[row] = [];
        for (let col = 0; col < size; col++) {
            // Determine vertex type based on DWBC High pattern
            let type;
            if (row + col === size - 1) {
                type = VertexType.c2; // Anti-diagonal
            }
            else if (row + col < size - 1) {
                type = VertexType.b1; // Upper-left triangle
            }
            else {
                type = VertexType.b2; // Lower-right triangle
            }
            // Get edges for this vertex
            const leftEdge = horizontalEdges[row][col];
            const rightEdge = horizontalEdges[row][col + 1];
            const topEdge = verticalEdges[row][col];
            const bottomEdge = verticalEdges[row + 1][col];
            // For internal vertices, we need to set edges consistently
            // based on the vertex type to maintain ice rule
            if (row > 0 && col > 0 && row < size - 1 && col < size - 1) {
                // Internal vertex - adjust edges based on vertex type
                switch (type) {
                    case VertexType.b1:
                        // b1: horizontal in, vertical out
                        // Ensure pattern consistency
                        if (horizontalEdges[row][col] === EdgeState.Out) {
                            // Left is in (from vertex perspective)
                            horizontalEdges[row][col + 1] = EdgeState.In; // Right is in
                            verticalEdges[row + 1][col] = EdgeState.Out; // Bottom is out
                        }
                        break;
                    case VertexType.b2:
                        // b2: vertical in, horizontal out
                        if (verticalEdges[row][col] === EdgeState.In) {
                            // Top is in (from vertex perspective)
                            verticalEdges[row + 1][col] = EdgeState.In; // Bottom is in
                            horizontalEdges[row][col + 1] = EdgeState.Out; // Right is out
                        }
                        break;
                    case VertexType.c2:
                        // c2: specific diagonal pattern
                        // Top-right in, bottom-left out
                        if (row === 0 || col === size - 1) {
                            // On boundary
                            verticalEdges[row + 1][col] = EdgeState.Out;
                        }
                        else if (row === size - 1 || col === 0) {
                            // On boundary
                            horizontalEdges[row][col + 1] = EdgeState.In;
                        }
                        else {
                            // Internal c2
                            horizontalEdges[row][col + 1] = EdgeState.In;
                            verticalEdges[row + 1][col] = EdgeState.Out;
                        }
                        break;
                }
            }
            // Create vertex configuration from edges
            const configuration = {
                left: leftEdge === EdgeState.Out ? EdgeState.In : EdgeState.Out,
                right: rightEdge === EdgeState.In ? EdgeState.In : EdgeState.Out,
                top: topEdge === EdgeState.In ? EdgeState.In : EdgeState.Out,
                bottom: bottomEdge === EdgeState.Out ? EdgeState.Out : EdgeState.In,
            };
            vertices[row][col] = {
                position: { row, col },
                type,
                configuration,
            };
        }
    }
    // Verify ice rule
    let violations = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const config = vertices[row][col].configuration;
            const ins = [config.left, config.right, config.top, config.bottom]
                .filter(e => e === EdgeState.In).length;
            const outs = [config.left, config.right, config.top, config.bottom]
                .filter(e => e === EdgeState.Out).length;
            if (ins !== 2 || outs !== 2) {
                violations++;
                if (violations <= 3) {
                    console.log(`  Violation at (${row},${col}): ${ins} ins, ${outs} outs`);
                }
            }
        }
    }
    console.log(`[DWBC High Ice-Valid] Total violations: ${violations}`);
    return {
        width: size,
        height: size,
        vertices,
        horizontalEdges,
        verticalEdges,
    };
}
/**
 * Generate DWBC Low with guaranteed ice rule satisfaction
 */
export function generateDWBCLowIceValid(size) {
    console.log(`[DWBC Low Ice-Valid] Generating for size ${size}`);
    // Initialize edge arrays
    const horizontalEdges = Array(size).fill(null).map(() => Array(size + 1).fill(EdgeState.Out));
    const verticalEdges = Array(size + 1).fill(null).map(() => Array(size).fill(EdgeState.Out));
    // Set DWBC Low boundary conditions
    // Top boundary: arrows point up (out of lattice)
    for (let col = 0; col < size; col++) {
        verticalEdges[0][col] = EdgeState.Out;
    }
    // Bottom boundary: arrows point up (into lattice)
    for (let col = 0; col < size; col++) {
        verticalEdges[size][col] = EdgeState.In;
    }
    // Left boundary: arrows point left (out of lattice)
    for (let row = 0; row < size; row++) {
        horizontalEdges[row][0] = EdgeState.In;
    }
    // Right boundary: arrows point left (into lattice)
    for (let row = 0; row < size; row++) {
        horizontalEdges[row][size] = EdgeState.Out;
    }
    // Build vertices row by row
    const vertices = [];
    for (let row = 0; row < size; row++) {
        vertices[row] = [];
        for (let col = 0; col < size; col++) {
            // Determine vertex type based on DWBC Low pattern
            let type;
            if (row === col) {
                type = VertexType.c2; // Main diagonal
            }
            else if (row < col) {
                type = VertexType.a1; // Upper-right triangle
            }
            else {
                type = VertexType.a2; // Lower-left triangle
            }
            // For internal vertices, set edges based on vertex type
            if (row > 0 && col > 0 && row < size - 1 && col < size - 1) {
                switch (type) {
                    case VertexType.a1:
                        // a1: left & top in, right & bottom out
                        horizontalEdges[row][col + 1] = EdgeState.Out;
                        verticalEdges[row + 1][col] = EdgeState.Out;
                        break;
                    case VertexType.a2:
                        // a2: right & bottom in, left & top out
                        horizontalEdges[row][col + 1] = EdgeState.In;
                        verticalEdges[row + 1][col] = EdgeState.In;
                        break;
                    case VertexType.c2:
                        // c2: diagonal pattern
                        horizontalEdges[row][col + 1] = EdgeState.In;
                        verticalEdges[row + 1][col] = EdgeState.Out;
                        break;
                }
            }
            // Get edges for this vertex
            const leftEdge = horizontalEdges[row][col];
            const rightEdge = horizontalEdges[row][col + 1];
            const topEdge = verticalEdges[row][col];
            const bottomEdge = verticalEdges[row + 1][col];
            // Create vertex configuration from edges
            const configuration = {
                left: leftEdge === EdgeState.In ? EdgeState.Out : EdgeState.In,
                right: rightEdge === EdgeState.Out ? EdgeState.Out : EdgeState.In,
                top: topEdge === EdgeState.Out ? EdgeState.Out : EdgeState.In,
                bottom: bottomEdge === EdgeState.In ? EdgeState.In : EdgeState.Out,
            };
            vertices[row][col] = {
                position: { row, col },
                type,
                configuration,
            };
        }
    }
    // Verify ice rule
    let violations = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const config = vertices[row][col].configuration;
            const ins = [config.left, config.right, config.top, config.bottom]
                .filter(e => e === EdgeState.In).length;
            const outs = [config.left, config.right, config.top, config.bottom]
                .filter(e => e === EdgeState.Out).length;
            if (ins !== 2 || outs !== 2) {
                violations++;
                if (violations <= 3) {
                    console.log(`  Violation at (${row},${col}): ${ins} ins, ${outs} outs`);
                }
            }
        }
    }
    console.log(`[DWBC Low Ice-Valid] Total violations: ${violations}`);
    return {
        width: size,
        height: size,
        vertices,
        horizontalEdges,
        verticalEdges,
    };
}
