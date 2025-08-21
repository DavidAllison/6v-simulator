/**
 * Tests for the storage system
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { storageService } from '../src/lib/storage';
import type { SimulationData } from '../src/lib/storage';
import { VertexType, BoundaryCondition } from '../src/lib/six-vertex/types';
import type { LatticeState, Vertex, EdgeState } from '../src/lib/six-vertex/types';

describe('Storage System', () => {
  // Clean up storage before and after tests
  beforeEach(async () => {
    await storageService.deleteAll();
  });

  afterEach(async () => {
    await storageService.deleteAll();
  });

  // Helper to create test data
  const createTestData = (): SimulationData => {
    const vertices: Vertex[][] = [];
    const horizontalEdges: EdgeState[][] = [];
    const verticalEdges: EdgeState[][] = [];

    for (let row = 0; row < 4; row++) {
      vertices[row] = [];
      horizontalEdges[row] = [];
      verticalEdges[row] = [];

      for (let col = 0; col < 4; col++) {
        vertices[row][col] = {
          position: { row, col },
          type: VertexType.a1,
          configuration: {
            left: 'in',
            right: 'out',
            top: 'in',
            bottom: 'out',
          },
        };
        horizontalEdges[row][col] = 'in';
        verticalEdges[row][col] = 'out';
      }
    }

    const latticeState: LatticeState = {
      width: 4,
      height: 4,
      vertices,
      horizontalEdges,
      verticalEdges,
    };

    return {
      latticeState,
      params: {
        temperature: 1.0,
        beta: 1.0,
        weights: {
          a1: 1.0,
          a2: 1.0,
          b1: 1.0,
          b2: 1.0,
          c1: 1.0,
          c2: 1.0,
        },
        boundaryCondition: BoundaryCondition.DWBC,
        dwbcConfig: { type: 'high' },
        seed: 12345,
      },
      stats: {
        step: 1000,
        energy: -50.5,
        vertexCounts: {
          [VertexType.a1]: 4,
          [VertexType.a2]: 4,
          [VertexType.b1]: 2,
          [VertexType.b2]: 2,
          [VertexType.c1]: 2,
          [VertexType.c2]: 2,
        },
        acceptanceRate: 0.45,
        flipAttempts: 2000,
        successfulFlips: 900,
        beta: 1.0,
      },
    };
  };

  describe('Basic Save/Load', () => {
    it('should save and load simulation data', async () => {
      const testData = createTestData();

      // Save the data
      const saveResult = await storageService.save(testData, {
        name: 'Test Save',
        description: 'Test description',
        compress: false,
      });

      expect(saveResult.success).toBe(true);
      expect(saveResult.id).toBeDefined();

      // Load the data back
      const loadResult = await storageService.load(saveResult.id!);

      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();

      // Verify the data matches
      const loaded = loadResult.data!;
      expect(loaded.latticeState.width).toBe(testData.latticeState.width);
      expect(loaded.latticeState.height).toBe(testData.latticeState.height);
      expect(loaded.params.temperature).toBe(testData.params.temperature);
      expect(loaded.stats.step).toBe(testData.stats.step);
    });

    it('should save with compression', async () => {
      const testData = createTestData();

      // Save with compression
      const saveResult = await storageService.save(testData, {
        name: 'Compressed Save',
        compress: true,
      });

      expect(saveResult.success).toBe(true);

      // Load and verify
      const loadResult = await storageService.load(saveResult.id!);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();
    });

    it('should handle multiple saves', async () => {
      const testData = createTestData();

      // Save multiple simulations
      const save1 = await storageService.save(testData, {
        name: 'Save 1',
      });

      const save2 = await storageService.save(testData, {
        name: 'Save 2',
      });

      const save3 = await storageService.save(testData, {
        name: 'Save 3',
      });

      expect(save1.success).toBe(true);
      expect(save2.success).toBe(true);
      expect(save3.success).toBe(true);

      // Get all saves
      const allSaves = await storageService.getAllSaves();
      expect(allSaves.length).toBe(3);

      // Verify names
      const names = allSaves.map((s) => s.name);
      expect(names).toContain('Save 1');
      expect(names).toContain('Save 2');
      expect(names).toContain('Save 3');
    });
  });

  describe('Save Management', () => {
    it('should prevent duplicate names without overwrite', async () => {
      const testData = createTestData();

      // First save should succeed
      const save1 = await storageService.save(testData, {
        name: 'Duplicate Test',
      });
      expect(save1.success).toBe(true);

      // Second save with same name should fail
      const save2 = await storageService.save(testData, {
        name: 'Duplicate Test',
        overwrite: false,
      });
      expect(save2.success).toBe(false);
      expect(save2.error).toContain('already exists');
    });

    it('should allow overwrite with same name', async () => {
      const testData = createTestData();

      // First save
      const save1 = await storageService.save(testData, {
        name: 'Overwrite Test',
      });
      expect(save1.success).toBe(true);

      // Modify data
      testData.stats.step = 2000;

      // Overwrite with same name
      const save2 = await storageService.save(testData, {
        name: 'Overwrite Test',
        overwrite: true,
      });
      expect(save2.success).toBe(true);

      // Verify only one save exists
      const allSaves = await storageService.getAllSaves();
      expect(allSaves.length).toBe(1);

      // Verify the data was updated
      const loadResult = await storageService.loadByName('Overwrite Test');
      expect(loadResult.success).toBe(true);
      expect(loadResult.data?.stats.step).toBe(2000);
    });

    it('should delete saves', async () => {
      const testData = createTestData();

      // Save a simulation
      const saveResult = await storageService.save(testData, {
        name: 'Delete Test',
      });
      expect(saveResult.success).toBe(true);

      // Verify it exists
      let allSaves = await storageService.getAllSaves();
      expect(allSaves.length).toBe(1);

      // Delete it
      const deleted = await storageService.delete(saveResult.id!);
      expect(deleted).toBe(true);

      // Verify it's gone
      allSaves = await storageService.getAllSaves();
      expect(allSaves.length).toBe(0);
    });
  });

  describe('Storage Statistics', () => {
    it('should provide storage statistics', async () => {
      const testData = createTestData();

      // Save some data
      await storageService.save(testData, { name: 'Stats Test 1' });
      await storageService.save(testData, { name: 'Stats Test 2' });

      // Get stats
      const stats = await storageService.getFormattedStats();

      expect(stats.totalSaves).toBe(2);
      expect(stats.totalSize).toBeDefined();
      expect(stats.storageType).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should preserve vertex configurations', async () => {
      const testData = createTestData();

      // Set specific vertex types
      testData.latticeState.vertices[0][0].type = VertexType.c1;
      testData.latticeState.vertices[1][1].type = VertexType.c2;
      testData.latticeState.vertices[2][2].type = VertexType.b1;
      testData.latticeState.vertices[3][3].type = VertexType.b2;

      // Save and load
      const saveResult = await storageService.save(testData, {
        name: 'Vertex Test',
      });

      const loadResult = await storageService.load(saveResult.id!);
      expect(loadResult.success).toBe(true);

      // Verify vertex types are preserved
      const loaded = loadResult.data!.latticeState;
      expect(loaded.vertices[0][0].type).toBe(VertexType.c1);
      expect(loaded.vertices[1][1].type).toBe(VertexType.c2);
      expect(loaded.vertices[2][2].type).toBe(VertexType.b1);
      expect(loaded.vertices[3][3].type).toBe(VertexType.b2);
    });

    it('should preserve edge states', async () => {
      const testData = createTestData();

      // Set specific edge states
      testData.latticeState.horizontalEdges[0][0] = 'out';
      testData.latticeState.horizontalEdges[1][1] = 'in';
      testData.latticeState.verticalEdges[2][2] = 'in';
      testData.latticeState.verticalEdges[3][3] = 'out';

      // Save and load
      const saveResult = await storageService.save(testData, {
        name: 'Edge Test',
      });

      const loadResult = await storageService.load(saveResult.id!);
      expect(loadResult.success).toBe(true);

      // Verify edge states are preserved
      const loaded = loadResult.data!.latticeState;
      expect(loaded.horizontalEdges[0][0]).toBe('out');
      expect(loaded.horizontalEdges[1][1]).toBe('in');
      expect(loaded.verticalEdges[2][2]).toBe('in');
      expect(loaded.verticalEdges[3][3]).toBe('out');
    });
  });
});
