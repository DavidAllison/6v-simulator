/**
 * IndexedDB storage provider for saving/loading simulations
 */

import type { StorageProvider, SavedSimulation, SaveResult, StorageStats } from './types';

const DB_NAME = 'SixVertexSimulations';
const DB_VERSION = 1;
const STORE_NAME = 'simulations';

export class IndexedDBProvider implements StorageProvider {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize the database connection
   */
  private async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Create indexes for efficient querying
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Check if IndexedDB is available
   */
  async isAvailable(): Promise<boolean> {
    if (typeof indexedDB === 'undefined') {
      return false;
    }

    try {
      await this.init();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save a simulation to IndexedDB
   */
  async save(data: SavedSimulation): Promise<SaveResult> {
    try {
      await this.init();
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(data);

        request.onsuccess = () => {
          resolve({
            success: true,
            id: data.id,
          });
        };

        request.onerror = () => {
          reject(new Error('Failed to save simulation'));
        };

        transaction.onerror = () => {
          reject(new Error('Transaction failed'));
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load a simulation by ID
   */
  async load(id: string): Promise<SavedSimulation | null> {
    try {
      await this.init();
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            // Convert date strings back to Date objects
            result.createdAt = new Date(result.createdAt);
            result.updatedAt = new Date(result.updatedAt);
          }
          resolve(result || null);
        };

        request.onerror = () => {
          reject(new Error('Failed to load simulation'));
        };
      });
    } catch (error) {
      console.error('Failed to load simulation:', error);
      return null;
    }
  }

  /**
   * Load all saved simulations
   */
  async loadAll(): Promise<SavedSimulation[]> {
    try {
      await this.init();
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const results = request.result || [];
          // Convert date strings back to Date objects
          results.forEach((result) => {
            result.createdAt = new Date(result.createdAt);
            result.updatedAt = new Date(result.updatedAt);
          });
          // Sort by updatedAt, most recent first
          results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          resolve(results);
        };

        request.onerror = () => {
          reject(new Error('Failed to load simulations'));
        };
      });
    } catch (error) {
      console.error('Failed to load all simulations:', error);
      return [];
    }
  }

  /**
   * Delete a simulation by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.init();
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          reject(new Error('Failed to delete simulation'));
        };
      });
    } catch (error) {
      console.error('Failed to delete simulation:', error);
      return false;
    }
  }

  /**
   * Delete all saved simulations
   */
  async deleteAll(): Promise<boolean> {
    try {
      await this.init();
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          reject(new Error('Failed to clear simulations'));
        };
      });
    } catch (error) {
      console.error('Failed to delete all simulations:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    try {
      await this.init();
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const simulations = await this.loadAll();
      let totalSize = 0;

      // Estimate size of each simulation
      simulations.forEach((sim) => {
        const jsonString = JSON.stringify(sim);
        totalSize += new Blob([jsonString]).size;
      });

      // Try to get storage estimate if available
      let maxStorage: number | undefined;
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          maxStorage = estimate.quota;
        } catch {
          // Storage estimate not available
        }
      }

      return {
        totalSaves: simulations.length,
        totalSize,
        storageType: 'indexeddb',
        maxStorage,
      };
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
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}
