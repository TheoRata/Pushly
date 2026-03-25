import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  initCache,
  getCachedTypes,
  setCachedTypes,
  getCachedComponents,
  setCachedComponents,
  clearOrgCache,
  isCacheStale,
} from '../services/metadata-cache.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-cache-test-'));
}

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
  let dataDir;

  beforeEach(() => {
    dataDir = makeTempDir();
    initCache(dataDir);
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // --- Test 1: setCachedTypes + getCachedTypes roundtrip ---
  describe('setCachedTypes / getCachedTypes', () => {
    it('returns types that were previously set', () => {
      setCachedTypes('MyOrg', SAMPLE_TYPES, dataDir);
      const result = getCachedTypes('MyOrg', dataDir);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
      expect(result[0].xmlName).toBe('ApexClass');
      expect(result[2].xmlName).toBe('CustomObject');
    });

    it('returns null for an org that has never been cached', () => {
      const result = getCachedTypes('NonExistentOrg', dataDir);
      expect(result).toBeNull();
    });
  });

  // --- Test 2: setCachedComponents + getCachedComponents roundtrip ---
  describe('setCachedComponents / getCachedComponents', () => {
    it('returns components that were previously set for a type', () => {
      setCachedComponents('MyOrg', 'Flow', SAMPLE_COMPONENTS, dataDir);
      const result = getCachedComponents('MyOrg', 'Flow', dataDir);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe('MyFlow');
    });

    it('returns null for a type that was never cached', () => {
      setCachedComponents('MyOrg', 'Flow', SAMPLE_COMPONENTS, dataDir);
      const result = getCachedComponents('MyOrg', 'ApexClass', dataDir);
      expect(result).toBeNull();
    });

    it('stores multiple types independently under the same org', () => {
      const apexComponents = [{ fullName: 'MyClass' }];
      setCachedComponents('MyOrg', 'Flow', SAMPLE_COMPONENTS, dataDir);
      setCachedComponents('MyOrg', 'ApexClass', apexComponents, dataDir);

      expect(getCachedComponents('MyOrg', 'Flow', dataDir)).toHaveLength(2);
      expect(getCachedComponents('MyOrg', 'ApexClass', dataDir)).toHaveLength(1);
    });
  });

  // --- Test 3: Cache persists to disk (survive server restart) ---
  describe('disk persistence', () => {
    it('data written by one init is readable after re-init from a new instance', () => {
      setCachedTypes('ProdOrg', SAMPLE_TYPES, dataDir);
      setCachedComponents('ProdOrg', 'Flow', SAMPLE_COMPONENTS, dataDir);

      // Simulate a server restart: call initCache again with the same dataDir
      // (The in-memory state is module-level; re-init reloads from disk)
      initCache(dataDir);

      const types = getCachedTypes('ProdOrg', dataDir);
      expect(types).not.toBeNull();
      expect(types).toHaveLength(3);

      const components = getCachedComponents('ProdOrg', 'Flow', dataDir);
      expect(components).not.toBeNull();
      expect(components).toHaveLength(2);
    });

    it('writes one JSON file per org inside data/cache/', () => {
      setCachedTypes('SandboxOrg', SAMPLE_TYPES, dataDir);

      const cacheFile = path.join(dataDir, 'data', 'cache', 'SandboxOrg.json');
      expect(fs.existsSync(cacheFile)).toBe(true);

      const stored = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      expect(stored.lastRefresh).toBeTypeOf('number');
      expect(stored.types).toHaveLength(3);
    });

    it('separate orgs produce separate cache files', () => {
      setCachedTypes('OrgA', SAMPLE_TYPES, dataDir);
      setCachedTypes('OrgB', SAMPLE_TYPES, dataDir);

      const cacheDir = path.join(dataDir, 'data', 'cache');
      expect(fs.existsSync(path.join(cacheDir, 'OrgA.json'))).toBe(true);
      expect(fs.existsSync(path.join(cacheDir, 'OrgB.json'))).toBe(true);
    });
  });

  // --- Test 4: isCacheStale returns true for old cache ---
  describe('isCacheStale', () => {
    it('returns true when cache is older than the TTL', () => {
      setCachedTypes('StaleOrg', SAMPLE_TYPES, dataDir);

      // Backdate the cache file's lastRefresh to 2 hours ago
      const cacheFile = path.join(dataDir, 'data', 'cache', 'StaleOrg.json');
      const stored = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      stored.lastRefresh = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      fs.writeFileSync(cacheFile, JSON.stringify(stored));

      // Re-init to pick up the backdated file
      initCache(dataDir);

      const ttlMs = 60 * 60 * 1000; // 1 hour
      expect(isCacheStale('StaleOrg', ttlMs, dataDir)).toBe(true);
    });

    // --- Test 5: isCacheStale returns false for fresh cache ---
    it('returns false when cache is within the TTL', () => {
      setCachedTypes('FreshOrg', SAMPLE_TYPES, dataDir);

      const ttlMs = 60 * 60 * 1000; // 1 hour
      expect(isCacheStale('FreshOrg', ttlMs, dataDir)).toBe(false);
    });

    it('returns true for an org that has no cache at all', () => {
      const ttlMs = 60 * 60 * 1000;
      expect(isCacheStale('NeverCachedOrg', ttlMs, dataDir)).toBe(true);
    });
  });

  // --- Test 6: clearOrgCache removes the file ---
  describe('clearOrgCache', () => {
    it('removes the cache file from disk', () => {
      setCachedTypes('TempOrg', SAMPLE_TYPES, dataDir);

      const cacheFile = path.join(dataDir, 'data', 'cache', 'TempOrg.json');
      expect(fs.existsSync(cacheFile)).toBe(true);

      clearOrgCache('TempOrg', dataDir);

      expect(fs.existsSync(cacheFile)).toBe(false);
    });

    it('makes getCachedTypes return null after clearing', () => {
      setCachedTypes('TempOrg', SAMPLE_TYPES, dataDir);
      clearOrgCache('TempOrg', dataDir);

      expect(getCachedTypes('TempOrg', dataDir)).toBeNull();
    });

    it('does not throw when clearing a non-existent org', () => {
      expect(() => clearOrgCache('GhostOrg', dataDir)).not.toThrow();
    });
  });

  // --- Test 7: getCachedTypes returns null for missing org ---
  describe('missing org', () => {
    it('getCachedComponents returns null when org has no cache entry', () => {
      const result = getCachedComponents('MissingOrg', 'Flow', dataDir);
      expect(result).toBeNull();
    });
  });

  // --- Test 8: Handles corrupt JSON file gracefully ---
  describe('corrupt cache file handling', () => {
    it('returns null and does not throw when cache file contains invalid JSON', () => {
      // Write a corrupt file directly into the cache directory
      const cacheDir = path.join(dataDir, 'data', 'cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, 'CorruptOrg.json'), '{ broken json !!!');

      // Re-init so the service attempts to load the corrupt file
      initCache(dataDir);

      expect(() => getCachedTypes('CorruptOrg', dataDir)).not.toThrow();
      expect(getCachedTypes('CorruptOrg', dataDir)).toBeNull();
    });

    it('returns null and does not throw when cache file is empty', () => {
      const cacheDir = path.join(dataDir, 'data', 'cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, 'EmptyOrg.json'), '');

      initCache(dataDir);

      expect(() => getCachedTypes('EmptyOrg', dataDir)).not.toThrow();
      expect(getCachedTypes('EmptyOrg', dataDir)).toBeNull();
    });

    it('continues serving valid orgs even when another org file is corrupt', () => {
      setCachedTypes('GoodOrg', SAMPLE_TYPES, dataDir);

      const cacheDir = path.join(dataDir, 'data', 'cache');
      fs.writeFileSync(path.join(cacheDir, 'BadOrg.json'), '<<< totally broken >>>');

      initCache(dataDir);

      expect(getCachedTypes('GoodOrg', dataDir)).toHaveLength(3);
      expect(getCachedTypes('BadOrg', dataDir)).toBeNull();
    });
  });
});
