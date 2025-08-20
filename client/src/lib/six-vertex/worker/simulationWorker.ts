/**
 * Web Worker for running the optimized simulation in a background thread
 * Allows the main thread to remain responsive while running large simulations
 */

import { OptimizedPhysicsSimulation } from '../optimizedSimulation';
import type { OptimizedSimConfig } from '../optimizedSimulation';

// Message types for communication with main thread
interface InitMessage {
  type: 'init';
  config: OptimizedSimConfig;
}

interface RunMessage {
  type: 'run';
  steps: number;
}

interface StartContinuousMessage {
  type: 'startContinuous';
  targetFPS: number;
}

interface StopMessage {
  type: 'stop';
}

interface ResetMessage {
  type: 'reset';
}

interface GetStateMessage {
  type: 'getState';
}

interface GetStatsMessage {
  type: 'getStats';
}

type WorkerMessage =
  | InitMessage
  | RunMessage
  | StartContinuousMessage
  | StopMessage
  | ResetMessage
  | GetStateMessage
  | GetStatsMessage;

// Response types
interface StatsResponse {
  type: 'stats';
  stats: any;
}

interface StateResponse {
  type: 'state';
  state: any;
}

interface ErrorResponse {
  type: 'error';
  error: string;
}

interface ReadyResponse {
  type: 'ready';
}

interface ProgressResponse {
  type: 'progress';
  progress: number;
  stats: any;
}

type WorkerResponse =
  | StatsResponse
  | StateResponse
  | ErrorResponse
  | ReadyResponse
  | ProgressResponse;

// Worker state
let simulation: OptimizedPhysicsSimulation | null = null;
let continuousRunning = false;
let animationFrame: number | null = null;

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  try {
    const message = event.data;

    switch (message.type) {
      case 'init':
        handleInit(message.config);
        break;

      case 'run':
        handleRun(message.steps);
        break;

      case 'startContinuous':
        handleStartContinuous(message.targetFPS);
        break;

      case 'stop':
        handleStop();
        break;

      case 'reset':
        handleReset();
        break;

      case 'getState':
        handleGetState();
        break;

      case 'getStats':
        handleGetStats();
        break;

      default:
        sendError('Unknown message type');
    }
  } catch (error) {
    sendError(error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Initialize the simulation
 */
function handleInit(config: OptimizedSimConfig): void {
  simulation = new OptimizedPhysicsSimulation(config);
  sendResponse({ type: 'ready' });
  sendResponse({ type: 'stats', stats: simulation.getStats() });
}

/**
 * Run simulation for a specified number of steps
 */
function handleRun(steps: number): void {
  if (!simulation) {
    sendError('Simulation not initialized');
    return;
  }

  const batchSize = 1000;
  const batches = Math.ceil(steps / batchSize);

  for (let i = 0; i < batches; i++) {
    const batchSteps = Math.min(batchSize, steps - i * batchSize);
    simulation.run(batchSteps);

    // Send progress update
    const progress = (i + 1) / batches;
    sendResponse({
      type: 'progress',
      progress,
      stats: simulation.getStats(),
    });
  }

  sendResponse({ type: 'stats', stats: simulation.getStats() });
}

/**
 * Start continuous simulation
 */
function handleStartContinuous(targetFPS: number): void {
  if (!simulation) {
    sendError('Simulation not initialized');
    return;
  }

  if (continuousRunning) {
    return; // Already running
  }

  continuousRunning = true;
  const frameTime = 1000 / targetFPS;
  let lastTime = performance.now();

  const animate = () => {
    if (!continuousRunning || !simulation) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;

    if (deltaTime >= frameTime) {
      // Calculate adaptive batch size based on performance
      const stepsPerFrame = Math.max(1, Math.floor(100 * (deltaTime / frameTime)));

      // Run the simulation
      simulation.run(stepsPerFrame);

      // Send stats update
      sendResponse({
        type: 'stats',
        stats: simulation.getStats(),
      });

      lastTime = currentTime;
    }

    // Use setTimeout instead of requestAnimationFrame in worker
    animationFrame = self.setTimeout(animate, 0) as unknown as number;
  };

  animate();
}

/**
 * Stop continuous simulation
 */
function handleStop(): void {
  continuousRunning = false;

  if (animationFrame !== null) {
    self.clearTimeout(animationFrame);
    animationFrame = null;
  }
}

/**
 * Reset the simulation
 */
function handleReset(): void {
  if (!simulation) {
    sendError('Simulation not initialized');
    return;
  }

  simulation.reset();
  sendResponse({ type: 'stats', stats: simulation.getStats() });
}

/**
 * Get current state
 */
function handleGetState(): void {
  if (!simulation) {
    sendError('Simulation not initialized');
    return;
  }

  sendResponse({ type: 'state', state: simulation.getState() });
}

/**
 * Get current statistics
 */
function handleGetStats(): void {
  if (!simulation) {
    sendError('Simulation not initialized');
    return;
  }

  sendResponse({ type: 'stats', stats: simulation.getStats() });
}

/**
 * Send response to main thread
 */
function sendResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

/**
 * Send error to main thread
 */
function sendError(error: string): void {
  sendResponse({ type: 'error', error });
}

// Export types for main thread
export type { WorkerMessage, WorkerResponse };
