/**
 * LocalStorage fallback provider for saving/loading simulations
 */

import type { StorageProvider, SavedSimulation, SaveResult, StorageStats } from './types';

const STORAGE_KEY_PREFIX = 'six-vertex-save-';
const INDEX_KEY = 'six-vertex-saves-index';

export class LocalStorageProvider implements StorageProvider {
  /**
   * Check if localStorage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the index of all saved simulations
   */
  private getIndex(): string[] {
    try {
      const indexJson = localStorage.getItem(INDEX_KEY);
      if (indexJson) {
        return JSON.parse(indexJson);
      }
    } catch (error) {
      console.error('Failed to parse index:', error);
    }
    return [];
  }

  /**
   * Update the index of saved simulations
   */
  private updateIndex(ids: string[]): void {
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('Failed to update index:', error);
    }
  }

  /**
   * Save a simulation to localStorage
   */
  async save(data: SavedSimulation): Promise<SaveResult> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${data.id}`;
      const jsonString = JSON.stringify(data);

      // Check if we have enough space
      const sizeEstimate = new Blob([jsonString]).size;
      const available = this.getAvailableSpace();

      if (available !== null && sizeEstimate > available) {
        return {
          success: false,
          error: 'Insufficient storage space',
        };
      }

      // Save the data
      localStorage.setItem(key, jsonString);

      // Update the index
      const index = this.getIndex();
      if (!index.includes(data.id)) {
        index.push(data.id);
        this.updateIndex(index);
      }

      return {
        success: true,
        id: data.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's a quota exceeded error
      if (message.includes('quota') || message.includes('storage')) {
        return {
          success: false,
          error: 'Storage quota exceeded. Please delete some saves to free up space.',
        };
      }

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Load a simulation by ID
   */
  async load(id: string): Promise<SavedSimulation | null> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${id}`;
      const jsonString = localStorage.getItem(key);

      if (!jsonString) {
        return null;
      }

      const data = JSON.parse(jsonString);

      // Convert date strings back to Date objects
      data.createdAt = new Date(data.createdAt);
      data.updatedAt = new Date(data.updatedAt);

      return data;
    } catch (error) {
      console.error('Failed to load simulation:', error);
      return null;
    }
  }

  /**
   * Load all saved simulations
   */
  async loadAll(): Promise<SavedSimulation[]> {
    const index = this.getIndex();
    const simulations: SavedSimulation[] = [];
    const invalidIds: string[] = [];

    for (const id of index) {
      const sim = await this.load(id);
      if (sim) {
        simulations.push(sim);
      } else {
        invalidIds.push(id);
      }
    }

    // Clean up invalid IDs from the index
    if (invalidIds.length > 0) {
      const validIds = index.filter((id) => !invalidIds.includes(id));
      this.updateIndex(validIds);
    }

    // Sort by updatedAt, most recent first
    simulations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return simulations;
  }

  /**
   * Delete a simulation by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${id}`;
      localStorage.removeItem(key);

      // Update the index
      const index = this.getIndex();
      const newIndex = index.filter((saveId) => saveId !== id);
      this.updateIndex(newIndex);

      return true;
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
      const index = this.getIndex();

      // Delete all simulation data
      for (const id of index) {
        const key = `${STORAGE_KEY_PREFIX}${id}`;
        localStorage.removeItem(key);
      }

      // Clear the index
      localStorage.removeItem(INDEX_KEY);

      return true;
    } catch (error) {
      console.error('Failed to delete all simulations:', error);
      return false;
    }
  }

  /**
   * Get available storage space (estimate)
   */
  private getAvailableSpace(): number | null {
    try {
      // Try to estimate available space
      // localStorage typically has a 5-10MB limit
      const maxSize = 5 * 1024 * 1024; // 5MB default

      // Calculate current usage
      let currentSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            currentSize += key.length + value.length;
          }
        }
      }

      return maxSize - currentSize;
    } catch {
      return null;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    try {
      const simulations = await this.loadAll();
      let totalSize = 0;

      // Calculate total size
      for (const sim of simulations) {
        const jsonString = JSON.stringify(sim);
        totalSize += new Blob([jsonString]).size;
      }

      // Estimate max storage (localStorage typically 5-10MB)
      const maxStorage = 5 * 1024 * 1024; // 5MB

      return {
        totalSaves: simulations.length,
        totalSize,
        storageType: 'localStorage',
        maxStorage,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalSaves: 0,
        totalSize: 0,
        storageType: 'localStorage',
      };
    }
  }
}
