/**
 * Main thread interface for the simulation Web Worker
 * Provides a clean API for controlling the simulation running in a background thread
 */

import type { OptimizedSimConfig } from '../optimizedSimulation';
import type { WorkerMessage, WorkerResponse } from './simulationWorker';

export interface WorkerSimulationCallbacks {
  onStats?: (stats: any) => void;
  onState?: (state: any) => void;
  onProgress?: (progress: number, stats: any) => void;
  onError?: (error: string) => void;
  onReady?: () => void;
}

/**
 * Web Worker-based simulation controller
 */
export class WorkerSimulation {
  private worker: Worker | null = null;
  private callbacks: WorkerSimulationCallbacks = {};
  private isInitialized = false;
  private pendingMessages: WorkerMessage[] = [];

  constructor(callbacks?: WorkerSimulationCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  /**
   * Initialize the worker and simulation
   */
  async initialize(config: OptimizedSimConfig): Promise<void> {
    // Create worker
    try {
      this.worker = new Worker(new URL('./simulationWorker.ts', import.meta.url), { type: 'module' });
    } catch (error) {
      // Worker creation failed (e.g., in Node environment during build)
      throw new Error(`Failed to create Web Worker: ${error}`);
    }

    // Set up message handler
    this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));

    // Send initialization message
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 5000);

      const originalOnReady = this.callbacks.onReady;
      this.callbacks.onReady = () => {
        clearTimeout(timeoutId);
        this.isInitialized = true;

        // Process any pending messages
        while (this.pendingMessages.length > 0) {
          const msg = this.pendingMessages.shift();
          if (msg) {
            this.sendMessage(msg);
          }
        }

        // Call original callback
        if (originalOnReady) {
          originalOnReady();
        }

        // Restore original callback
        this.callbacks.onReady = originalOnReady;
        resolve();
      };

      this.sendMessage({ type: 'init', config });
    });
  }

  /**
   * Run simulation for a specified number of steps
   */
  run(steps: number): void {
    this.sendMessage({ type: 'run', steps });
  }

  /**
   * Start continuous simulation
   */
  startContinuous(targetFPS: number = 60): void {
    this.sendMessage({ type: 'startContinuous', targetFPS });
  }

  /**
   * Stop continuous simulation
   */
  stop(): void {
    this.sendMessage({ type: 'stop' });
  }

  /**
   * Reset the simulation
   */
  reset(): void {
    this.sendMessage({ type: 'reset' });
  }

  /**
   * Request current state
   */
  getState(): void {
    this.sendMessage({ type: 'getState' });
  }

  /**
   * Request current statistics
   */
  getStats(): void {
    this.sendMessage({ type: 'getStats' });
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: WorkerSimulationCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Send message to worker
   */
  private sendMessage(message: WorkerMessage): void {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    if (!this.isInitialized && message.type !== 'init') {
      // Queue message until initialized
      this.pendingMessages.push(message);
      return;
    }

    this.worker.postMessage(message);
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const response = event.data;

    switch (response.type) {
      case 'stats':
        if (this.callbacks.onStats) {
          this.callbacks.onStats(response.stats);
        }
        break;

      case 'state':
        if (this.callbacks.onState) {
          this.callbacks.onState(response.state);
        }
        break;

      case 'progress':
        if (this.callbacks.onProgress) {
          this.callbacks.onProgress(response.progress, response.stats);
        }
        break;

      case 'error':
        if (this.callbacks.onError) {
          this.callbacks.onError(response.error);
        } else {
          console.error('Worker error:', response.error);
        }
        break;

      case 'ready':
        if (this.callbacks.onReady) {
          this.callbacks.onReady();
        }
        break;
    }
  }
}

/**
 * Check if Web Workers are supported
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Create a worker simulation instance with automatic fallback
 */
export async function createWorkerSimulation(
  config: OptimizedSimConfig,
  callbacks?: WorkerSimulationCallbacks,
): Promise<WorkerSimulation | null> {
  // Skip Web Worker in test/build environments
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    console.warn('Web Workers disabled in test environment');
    return null;
  }

  if (!isWorkerSupported()) {
    console.warn('Web Workers not supported, falling back to main thread');
    return null;
  }

  try {
    const simulation = new WorkerSimulation(callbacks);
    await simulation.initialize(config);
    return simulation;
  } catch (error) {
    console.error('Failed to create worker simulation:', error);
    return null;
  }
}
