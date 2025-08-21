/**
 * Type definitions for the storage system
 */

import type { LatticeState, SimulationParams, SimulationStats } from '../six-vertex/types';

/**
 * Saved simulation state that can be persisted
 */
export interface SavedSimulation {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  version: string; // Version of the save format
  data: any; // Can be compressed string or SimulationData object
  metadata: SimulationMetadata;
}

/**
 * Core simulation data that needs to be saved
 */
export interface SimulationData {
  latticeState: LatticeState;
  params: SimulationParams;
  stats: SimulationStats;
}

/**
 * Additional metadata about the simulation
 */
export interface SimulationMetadata {
  latticeSize: {
    width: number;
    height: number;
  };
  totalSteps: number;
  simulationTime?: number; // Time spent simulating in ms
  compression?: 'none' | 'lz-string'; // Compression method used
  checksum?: string; // Optional checksum for data integrity
}

/**
 * Options for saving a simulation
 */
export interface SaveOptions {
  name: string;
  description?: string;
  compress?: boolean;
  overwrite?: boolean; // Whether to overwrite existing save with same name
}

/**
 * Options for loading a simulation
 */
export interface LoadOptions {
  decompress?: boolean;
  validateChecksum?: boolean;
}

/**
 * Result of a save operation
 */
export interface SaveResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Result of a load operation
 */
export interface LoadResult {
  success: boolean;
  data?: SimulationData;
  error?: string;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalSaves: number;
  totalSize: number; // Total size in bytes
  storageType: 'indexeddb' | 'localStorage';
  maxStorage?: number; // Maximum storage available
}

/**
 * Interface for storage implementations
 */
export interface StorageProvider {
  isAvailable(): Promise<boolean>;
  save(data: SavedSimulation): Promise<SaveResult>;
  load(id: string): Promise<SavedSimulation | null>;
  loadAll(): Promise<SavedSimulation[]>;
  delete(id: string): Promise<boolean>;
  deleteAll(): Promise<boolean>;
  getStats(): Promise<StorageStats>;
}

/**
 * Events emitted by the storage system
 */
export interface StorageEvents {
  onSaveComplete: (result: SaveResult) => void;
  onLoadComplete: (result: LoadResult) => void;
  onDeleteComplete: (id: string) => void;
  onStorageError: (error: Error) => void;
}
