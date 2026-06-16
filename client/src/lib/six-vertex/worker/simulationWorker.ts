/**
 * Web Worker for running the optimized simulation in a background thread
 * Allows the main thread to remain responsive while running large simulations.
 *
 * State is exchanged as a compact, flat Int8Array (row-major, id = row*size+col;
 * ids match cStyleFlipLogic a1=0..c2=5) and posted with the buffer in the
 * transfer list. We NEVER post the object-graph LatticeState (~N*N objects),
 * which is prohibitively expensive to structured-clone for large N.
 */

import { OptimizedPhysicsSimulation } from '../optimizedSimulation';
import type { OptimizedSimConfig } from '../optimizedSimulation';

// The project tsconfig includes the DOM lib, so the global `self` is typed as a
// Window whose postMessage(transfer) overload differs from the worker scope's.
// At runtime this file only ever runs inside a DedicatedWorkerGlobalScope, so we
// post through this narrowly-typed helper to get the transferable-list overload.
const postToMain = (message: unknown, transfer?: Transferable[]): void => {
  const post = self.postMessage as (msg: unknown, transfer?: Transferable[]) => void;
  if (transfer && transfer.length > 0) {
    post(message, transfer);
  } else {
    post(message);
  }
};

// Message types for communication with main thread
interface InitMessage {
  type: 'init';
  config: OptimizedSimConfig;
}

interface RunMessage {
  type: 'run';
  steps: number;
}

interface StepMessage {
  type: 'step';
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

interface GetRawStateMessage {
  type: 'getRawState';
}

interface SetStateMessage {
  type: 'setState';
  vertices: Int8Array;
}

interface GetStatsMessage {
  type: 'getStats';
}

type WorkerMessage =
  | InitMessage
  | RunMessage
  | StepMessage
  | StartContinuousMessage
  | StopMessage
  | ResetMessage
  | GetRawStateMessage
  | SetStateMessage
  | GetStatsMessage;

// Response types
interface StatsResponse {
  type: 'stats';
  // The optimized engine returns a loosely-typed stats object (matches existing
  // style); the main thread re-narrows it before handing it to consumers.
  stats: any;
}

interface RawStateResponse {
  type: 'rawState';
  vertices: Int8Array;
  width: number;
  height: number;
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
  | RawStateResponse
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

      case 'step':
        handleStep();
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

      case 'getRawState':
        handleGetRawState();
        break;

      case 'setState':
        handleSetState(message.vertices);
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
  sendStats();
  sendRawState();
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

  sendStats();
  sendRawState();
}

/**
 * Run a single batch of steps (used for step-by-step control).
 */
function handleStep(): void {
  if (!simulation) {
    sendError('Simulation not initialized');
    return;
  }

  // A single 'step' message must advance exactly one Monte Carlo step, matching
  // the main-thread path (optimizedSim.run(1)). Previously the worker ran a full
  // batch (~100), so the Step button jumped ~100x further on large (worker)
  // lattices than on small ones — inconsistent, surprising step semantics.
  simulation.run(1);
  sendStats();
  sendRawState();
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

      // Send stats + a raw snapshot for rendering. One snapshot per animate tick
      // is acceptable: rendering (not transfer) is the main-thread bottleneck.
      sendStats();
      sendRawState();

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
  sendStats();
  sendRawState();
}

/**
 * Send the current raw state on demand.
 */
function handleGetRawState(): void {
  if (!simulation) {
    sendError('Simulation not initialized');
    return;
  }
  sendRawState();
}

/**
 * Adopt an externally-supplied state (e.g. an imported configuration).
 * The transferred buffer is owned by the worker after this message.
 */
function handleSetState(vertices: Int8Array): void {
  if (!simulation) {
    sendError('Simulation not initialized');
    return;
  }
  simulation.setState(vertices);
  sendStats();
  sendRawState();
}

/**
 * Get current statistics
 */
function handleGetStats(): void {
  if (!simulation) {
    sendError('Simulation not initialized');
    return;
  }
  sendStats();
}

/**
 * Post the current stats to the main thread.
 */
function sendStats(): void {
  if (!simulation) return;
  sendResponse({ type: 'stats', stats: simulation.getStats() });
}

/**
 * Post a fresh raw-state snapshot, transferring its backing buffer so no copy is
 * made during structured clone. getRawState() already returns a fresh copy, so
 * the engine keeps ownership of its own vertices array.
 */
function sendRawState(): void {
  if (!simulation) return;
  const vertices = new Int8Array(simulation.getRawState());
  const size = simulation.getSize();
  const resp: RawStateResponse = {
    type: 'rawState',
    vertices,
    width: size,
    height: size,
  };
  postToMain(resp, [resp.vertices.buffer]);
}

/**
 * Send response to main thread (no transfer list)
 */
function sendResponse(response: WorkerResponse): void {
  postToMain(response);
}

/**
 * Send error to main thread
 */
function sendError(error: string): void {
  sendResponse({ type: 'error', error });
}

// Export types for main thread
export type { WorkerMessage, WorkerResponse };
