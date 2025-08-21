/**
 * Main storage service for saving/loading simulations
 * Provides a unified interface with IndexedDB primary and localStorage fallback
 */

import type {
  SavedSimulation,
  SimulationData,
  SaveOptions,
  LoadOptions,
  SaveResult,
  LoadResult,
  StorageStats,
  StorageEvents,
  StorageProvider,
} from './types';
import { IndexedDBProvider } from './indexedDbProvider';
import { LocalStorageProvider } from './localStorageProvider';
import {
  serializeSimulationData,
  deserializeSimulationData,
  calculateChecksum,
  validateChecksum,
  SERIALIZATION_VERSION,
} from './serialization';
import { formatBytes, getCompressionRatio } from './compression';

export class StorageService {
  private provider: StorageProvider | null = null;
  private eventHandlers: Map<keyof StorageEvents, Set<Function>> = new Map();
  private isInitialized = false;

  constructor() {
    // Initialize event handler sets
    for (const event of [
      'onSaveComplete',
      'onLoadComplete',
      'onDeleteComplete',
      'onStorageError',
    ] as const) {
      this.eventHandlers.set(event, new Set());
    }
  }

  /**
   * Initialize the storage service
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try IndexedDB first
      const indexedDB = new IndexedDBProvider();
      if (await indexedDB.isAvailable()) {
        this.provider = indexedDB;
        console.log('Using IndexedDB for storage');
      } else {
        // Fall back to localStorage
        const localStorage = new LocalStorageProvider();
        if (await localStorage.isAvailable()) {
          this.provider = localStorage;
          console.log('Using localStorage for storage (fallback)');
        } else {
          throw new Error('No storage provider available');
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      this.emit('onStorageError', error as Error);
      throw error;
    }
  }

  /**
   * Save the current simulation state
   */
  async save(data: SimulationData, options: SaveOptions): Promise<SaveResult> {
    await this.init();

    if (!this.provider) {
      return {
        success: false,
        error: 'Storage not initialized',
      };
    }

    try {
      // Check if a save with the same name already exists
      if (!options.overwrite) {
        const existing = await this.findByName(options.name);
        if (existing) {
          return {
            success: false,
            error: `A save named "${options.name}" already exists. Use overwrite option to replace it.`,
          };
        }
      }

      // Generate ID (use name-based ID for overwrite support)
      const id = this.generateId(options.name);

      // Serialize the data
      const useCompression = options.compress !== false; // Default to true
      const serialized = serializeSimulationData(data, useCompression);

      // Calculate checksum
      const checksum = calculateChecksum(serialized);

      // Get compression ratio if compressed
      let compressionInfo = '';
      if (useCompression) {
        const ratio = getCompressionRatio(data, serialized);
        compressionInfo = ` (${Math.round((1 - ratio) * 100)}% compressed)`;
      }

      // Create the saved simulation object
      const savedSimulation: SavedSimulation = {
        id,
        name: options.name,
        description: options.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: SERIALIZATION_VERSION,
        data: useCompression ? serialized : JSON.parse(serialized), // Store compressed as string, uncompressed as object
        metadata: {
          latticeSize: {
            width: data.latticeState.width,
            height: data.latticeState.height,
          },
          totalSteps: data.stats.step,
          compression: useCompression ? 'lz-string' : 'none',
          checksum,
        },
      };

      // If overwriting, preserve the original creation date
      if (options.overwrite) {
        const existing = await this.findByName(options.name);
        if (existing) {
          savedSimulation.createdAt = existing.createdAt;
          // Delete the old save first
          await this.provider.delete(existing.id);
        }
      }

      // Save to storage
      const result = await this.provider.save(savedSimulation);

      if (result.success) {
        console.log(`Simulation saved successfully${compressionInfo}`);
        this.emit('onSaveComplete', result);
      } else {
        this.emit('onStorageError', new Error(result.error || 'Save failed'));
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('onStorageError', error as Error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Load a simulation by ID
   */
  async load(id: string, options?: LoadOptions): Promise<LoadResult> {
    await this.init();

    if (!this.provider) {
      return {
        success: false,
        error: 'Storage not initialized',
      };
    }

    try {
      const saved = await this.provider.load(id);

      if (!saved) {
        return {
          success: false,
          error: 'Simulation not found',
        };
      }

      // Check version compatibility
      if (saved.version !== SERIALIZATION_VERSION) {
        console.warn(
          `Save version mismatch: expected ${SERIALIZATION_VERSION}, got ${saved.version}`,
        );
      }

      // Validate checksum if requested
      if (options?.validateChecksum && saved.metadata.checksum) {
        const serialized = JSON.stringify(saved.data);
        if (!validateChecksum(serialized, saved.metadata.checksum)) {
          return {
            success: false,
            error: 'Checksum validation failed - data may be corrupted',
          };
        }
      }

      // Deserialize the data
      const wasCompressed = saved.metadata.compression === 'lz-string';
      const serializedData = wasCompressed ? saved.data : JSON.stringify(saved.data);
      const data = deserializeSimulationData(serializedData as string, wasCompressed);

      if (!data) {
        return {
          success: false,
          error: 'Failed to deserialize simulation data',
        };
      }

      const result: LoadResult = {
        success: true,
        data,
      };

      this.emit('onLoadComplete', result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('onStorageError', error as Error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Load a simulation by name
   */
  async loadByName(name: string, options?: LoadOptions): Promise<LoadResult> {
    const saved = await this.findByName(name);

    if (!saved) {
      return {
        success: false,
        error: `No save found with name "${name}"`,
      };
    }

    return this.load(saved.id, options);
  }

  /**
   * Get all saved simulations (metadata only)
   */
  async getAllSaves(): Promise<SavedSimulation[]> {
    await this.init();

    if (!this.provider) {
      return [];
    }

    try {
      return await this.provider.loadAll();
    } catch (error) {
      console.error('Failed to load saves:', error);
      this.emit('onStorageError', error as Error);
      return [];
    }
  }

  /**
   * Delete a save by ID
   */
  async delete(id: string): Promise<boolean> {
    await this.init();

    if (!this.provider) {
      return false;
    }

    try {
      const result = await this.provider.delete(id);
      if (result) {
        this.emit('onDeleteComplete', id);
      }
      return result;
    } catch (error) {
      console.error('Failed to delete save:', error);
      this.emit('onStorageError', error as Error);
      return false;
    }
  }

  /**
   * Delete all saves
   */
  async deleteAll(): Promise<boolean> {
    await this.init();

    if (!this.provider) {
      return false;
    }

    try {
      return await this.provider.deleteAll();
    } catch (error) {
      console.error('Failed to delete all saves:', error);
      this.emit('onStorageError', error as Error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    await this.init();

    if (!this.provider) {
      return {
        totalSaves: 0,
        totalSize: 0,
        storageType: 'indexeddb',
      };
    }

    try {
      return await this.provider.getStats();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalSaves: 0,
        totalSize: 0,
        storageType: 'indexeddb',
      };
    }
  }

  /**
   * Get formatted storage statistics
   */
  async getFormattedStats(): Promise<{
    totalSaves: number;
    totalSize: string;
    storageType: string;
    usagePercent?: number;
  }> {
    const stats = await this.getStats();

    return {
      totalSaves: stats.totalSaves,
      totalSize: formatBytes(stats.totalSize),
      storageType: stats.storageType,
      usagePercent: stats.maxStorage
        ? Math.round((stats.totalSize / stats.maxStorage) * 100)
        : undefined,
    };
  }

  /**
   * Find a save by name
   */
  private async findByName(name: string): Promise<SavedSimulation | null> {
    const saves = await this.getAllSaves();
    return saves.find((save) => save.name === name) || null;
  }

  /**
   * Generate a unique ID for a save
   */
  private generateId(name: string): string {
    // Create a name-based ID for consistent overwriting
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const nameSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substr(0, 20);
    return `${nameSlug}-${timestamp}-${random}`;
  }

  /**
   * Event handling
   */
  on<K extends keyof StorageEvents>(event: K, handler: StorageEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler as Function);
    }
  }

  off<K extends keyof StorageEvents>(event: K, handler: StorageEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler as Function);
    }
  }

  private emit<K extends keyof StorageEvents>(
    event: K,
    ...args: Parameters<StorageEvents[K]>
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          (handler as Function)(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}

// Export a singleton instance
export const storageService = new StorageService();
