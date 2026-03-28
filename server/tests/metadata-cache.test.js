import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, closeDb } from '../services/db.js';
import {
  initCache,
  getCachedTypes,
  setCachedTypes,
  getCachedComponents,
  setCachedComponents,
  clearOrgCache,
  isCacheStale,
} from '../services/metadata-cache.js';

const SAMPLE_TYPES = [
  { xmlName: 'ApexClass', directoryName: 'classes' },
  { xmlName: 'Flow', directoryName: 'flows' },
  { xmlName: 'CustomObject', directoryName: 'objects' },
];

const SAMPLE_COMPONENTS = [
  { fullName: 'MyFlow', fileName: 'flows/MyFlow.flow-meta.xml' },
  { fullName: 'AnotherFlow', fileName: 'flows/AnotherFlow.flow-meta.xml' },
];

describe('metadata-cache service', () => {
  beforeEach(() => {
    initDb(':memory:');
    initCache();
  });

  afterEach(() => {
    closeDb();
  });

  describe('getCachedTypes', () => {
    it('returns null when nothing cached', () => {
      const result = getCachedTypes('NonExistentOrg');
      expect(result).toBeNull();
    });
  });

  describe('setCachedTypes + getCachedTypes', () => {
    it('round-trips correctly', () => {
      setCachedTypes('MyOrg', SAMPLE_TYPES);
      const result = getCachedTypes('MyOrg');

      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
      expect(result[0].xmlName).toBe('ApexClass');
      expect(result[2].xmlName).toBe('CustomObject');
    });
  });

  describe('getCachedComponents', () => {
    it('returns null when nothing cached', () => {
      const result = getCachedComponents('MyOrg', 'Flow');
      expect(result).toBeNull();
    });
  });

  describe('setCachedComponents + getCachedComponents', () => {
    it('round-trips correctly', () => {
      setCachedComponents('MyOrg', 'Flow', SAMPLE_COMPONENTS);
      const result = getCachedComponents('MyOrg', 'Flow');

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe('MyFlow');
    });
  });

  describe('different types stored independently', () => {
    it('stores multiple types independently for the same org', () => {
      const apexComponents = [{ fullName: 'MyClass' }];
      setCachedComponents('MyOrg', 'Flow', SAMPLE_COMPONENTS);
      setCachedComponents('MyOrg', 'ApexClass', apexComponents);

      expect(getCachedComponents('MyOrg', 'Flow')).toHaveLength(2);
      expect(getCachedComponents('MyOrg', 'ApexClass')).toHaveLength(1);
    });
  });

  describe('clearOrgCache', () => {
    it('removes all data for an org', () => {
      setCachedTypes('TempOrg', SAMPLE_TYPES);
      setCachedComponents('TempOrg', 'Flow', SAMPLE_COMPONENTS);

      clearOrgCache('TempOrg');

      expect(getCachedTypes('TempOrg')).toBeNull();
      expect(getCachedComponents('TempOrg', 'Flow')).toBeNull();
    });

    it('does not throw when clearing a non-existent org', () => {
      expect(() => clearOrgCache('GhostOrg')).not.toThrow();
    });
  });

  describe('isCacheStale', () => {
    it('returns true when nothing cached', () => {
      expect(isCacheStale('NeverCachedOrg')).toBe(true);
    });

    it('returns false for recent data', () => {
      setCachedTypes('FreshOrg', SAMPLE_TYPES);
      expect(isCacheStale('FreshOrg', 60 * 60 * 1000)).toBe(false);
    });
  });
});
