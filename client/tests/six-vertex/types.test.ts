import {
  VertexType,
  EdgeState,
  VertexConfiguration,
  getVertexType,
  getVertexConfiguration,
} from '../../src/lib/six-vertex/types';

describe('6-Vertex Model Types', () => {
  describe('getVertexType', () => {
    it('should correctly identify vertex type a1', () => {
      const config: VertexConfiguration = {
        left: EdgeState.In,
        top: EdgeState.In,
        right: EdgeState.Out,
        bottom: EdgeState.Out,
      };
      expect(getVertexType(config)).toBe(VertexType.a1);
    });

    it('should correctly identify vertex type a2', () => {
      const config: VertexConfiguration = {
        right: EdgeState.In,
        bottom: EdgeState.In,
        left: EdgeState.Out,
        top: EdgeState.Out,
      };
      expect(getVertexType(config)).toBe(VertexType.a2);
    });

    it('should correctly identify vertex type b1', () => {
      const config: VertexConfiguration = {
        left: EdgeState.In,
        right: EdgeState.In,
        top: EdgeState.Out,
        bottom: EdgeState.Out,
      };
      expect(getVertexType(config)).toBe(VertexType.b1);
    });

    it('should correctly identify vertex type b2', () => {
      const config: VertexConfiguration = {
        top: EdgeState.In,
        bottom: EdgeState.In,
        left: EdgeState.Out,
        right: EdgeState.Out,
      };
      expect(getVertexType(config)).toBe(VertexType.b2);
    });

    it('should correctly identify vertex type c1', () => {
      const config: VertexConfiguration = {
        left: EdgeState.In,
        bottom: EdgeState.In,
        right: EdgeState.Out,
        top: EdgeState.Out,
      };
      expect(getVertexType(config)).toBe(VertexType.c1);
    });

    it('should correctly identify vertex type c2', () => {
      const config: VertexConfiguration = {
        right: EdgeState.In,
        top: EdgeState.In,
        left: EdgeState.Out,
        bottom: EdgeState.Out,
      };
      expect(getVertexType(config)).toBe(VertexType.c2);
    });

    it('should return null for invalid configuration (ice rule violation)', () => {
      const config: VertexConfiguration = {
        left: EdgeState.In,
        top: EdgeState.In,
        right: EdgeState.In,
        bottom: EdgeState.Out,
      };
      expect(getVertexType(config)).toBeNull();
    });
  });

  describe('getVertexConfiguration', () => {
    it('should return correct configuration for each vertex type', () => {
      const types = [
        VertexType.a1,
        VertexType.a2,
        VertexType.b1,
        VertexType.b2,
        VertexType.c1,
        VertexType.c2,
      ];

      for (const type of types) {
        const config = getVertexConfiguration(type);

        // Verify ice rule: 2 ins and 2 outs
        const edges = [config.left, config.right, config.top, config.bottom];
        const ins = edges.filter((e) => e === EdgeState.In).length;
        const outs = edges.filter((e) => e === EdgeState.Out).length;

        expect(ins).toBe(2);
        expect(outs).toBe(2);

        // Verify round trip
        expect(getVertexType(config)).toBe(type);
      }
    });
  });

  describe('Ice Rule Validation', () => {
    it('should satisfy ice rule for all vertex types', () => {
      const types = [
        VertexType.a1,
        VertexType.a2,
        VertexType.b1,
        VertexType.b2,
        VertexType.c1,
        VertexType.c2,
      ];

      for (const type of types) {
        const config = getVertexConfiguration(type);
        const edges = [config.left, config.right, config.top, config.bottom];
        const ins = edges.filter((e) => e === EdgeState.In).length;
        const outs = edges.filter((e) => e === EdgeState.Out).length;

        expect(ins).toBe(2);
        expect(outs).toBe(2);
      }
    });
  });
});
