/**
 * Main export file for the 6-vertex model physics engine
 */

// Core types
export * from './types';

// Vertex shapes and path rendering
export * from './vertexShapes';

// Initial state generators
export {
  generateDWBCHigh,
  generateDWBCLow,
  generateDWBCState,
  generateRandomIceState,
  generateUniformState,
  validateIceRule,
} from './initialStates';

// Physics-accurate flip operations
export {
  FlipDirection,
  isFlippable,
  executeFlip,
  getWeightRatio,
  getAllFlippablePositions,
  calculateHeight,
} from './physicsFlips';
export type { FlipCapability } from './physicsFlips';

// Physics simulation
export { PhysicsSimulation } from './physicsSimulation';
export type { PhysicsSimConfig } from './physicsSimulation';

// Random number generation
export { SeededRNG, globalRNG, createRNG, generateSeed } from './rng';

// Path renderer
export * from './renderer/pathRenderer';

// Test utilities (for development)
export { runTests, validateDWBCHigh, validateDWBCLow, printLattice } from './test';
