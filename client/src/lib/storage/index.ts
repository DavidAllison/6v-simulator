/**
 * Storage module exports
 */

export { storageService, StorageService } from './storageService';
export type {
  SavedSimulation,
  SimulationData,
  SimulationMetadata,
  SaveOptions,
  LoadOptions,
  SaveResult,
  LoadResult,
  StorageStats,
  StorageEvents,
} from './types';
export { formatBytes } from './compression';
