import fs from 'node:fs';
import path from 'node:path';

// Module-level in-memory store: Map<orgAlias, { lastRefresh, types, components }>
// Keyed by dataDir so multiple test instances with different temp dirs don't collide.
const stores = new Map();

/**
 * Returns the in-memory store map for the given dataDir, creating it if needed.
 * @param {string} dataDir
 * @returns {Map<string, object>}
 */
function getStore(dataDir) {
  if (!stores.has(dataDir)) {
    stores.set(dataDir, new Map());
  }
  return stores.get(dataDir);
}

/**
 * Returns the absolute path of the cache directory.
 * @param {string} dataDir
 * @returns {string}
 */
function cacheDir(dataDir) {
  return path.join(dataDir, 'data', 'cache');
}

/**
 * Returns the path of the JSON file for a given org alias.
 * @param {string} dataDir
 * @param {string} orgAlias
 * @returns {string}
 */
function cacheFilePath(dataDir, orgAlias) {
  return path.join(cacheDir(dataDir), `${orgAlias}.json`);
}

/**
 * Attempts to load and parse a single org cache file from disk.
 * Returns the parsed object on success, or null on any error.
 * @param {string} filePath
 * @returns {object|null}
 */
function loadCacheFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    // Sanity-check: must be a non-null object with a numeric lastRefresh
    if (!parsed || typeof parsed !== 'object' || typeof parsed.lastRefresh !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists the current in-memory entry for an org to disk.
 * Creates the cache directory if it does not yet exist.
 * @param {string} dataDir
 * @param {string} orgAlias
 */
function persistToDisk(dataDir, orgAlias) {
  const store = getStore(dataDir);
  const entry = store.get(orgAlias);
  if (!entry) return;

  const dir = cacheDir(dataDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cacheFilePath(dataDir, orgAlias), JSON.stringify(entry, null, 2));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialises the cache by loading any existing JSON files from
 * `<dataDir>/data/cache/` into memory.  Call this once on server startup.
 * Calling it again (e.g. in tests) replaces the in-memory state for that
 * dataDir with whatever is currently on disk.
 *
 * @param {string} dataDir  Root data directory (e.g. the `data/` folder).
 */
export function initCache(dataDir) {
  // Reset the in-memory store for this dataDir so re-init is idempotent.
  stores.set(dataDir, new Map());
  const store = getStore(dataDir);

  const dir = cacheDir(dataDir);
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const orgAlias = file.slice(0, -5); // strip '.json'
    const parsed = loadCacheFile(path.join(dir, file));
    if (parsed) {
      store.set(orgAlias, parsed);
    }
    // Corrupt / empty files are silently skipped — store entry stays absent.
  }
}

/**
 * Returns the cached types array for `orgAlias`, or null if not cached.
 * @param {string} orgAlias
 * @param {string} dataDir
 * @returns {Array|null}
 */
export function getCachedTypes(orgAlias, dataDir) {
  const entry = getStore(dataDir).get(orgAlias);
  if (!entry || !Array.isArray(entry.types)) return null;
  return entry.types;
}

/**
 * Saves `types` for `orgAlias` and persists the entry to disk.
 * @param {string} orgAlias
 * @param {Array}  types
 * @param {string} dataDir
 */
export function setCachedTypes(orgAlias, types, dataDir) {
  const store = getStore(dataDir);
  const existing = store.get(orgAlias) || { components: {} };
  const entry = {
    ...existing,
    lastRefresh: Date.now(),
    types,
    components: existing.components || {},
  };
  store.set(orgAlias, entry);
  persistToDisk(dataDir, orgAlias);
}

/**
 * Returns the cached component array for `orgAlias`/`typeName`, or null.
 * @param {string} orgAlias
 * @param {string} typeName
 * @param {string} dataDir
 * @returns {Array|null}
 */
export function getCachedComponents(orgAlias, typeName, dataDir) {
  const entry = getStore(dataDir).get(orgAlias);
  if (!entry || !entry.components || !Array.isArray(entry.components[typeName])) return null;
  return entry.components[typeName];
}

/**
 * Saves `components` for `orgAlias`/`typeName` and persists to disk.
 * @param {string} orgAlias
 * @param {string} typeName
 * @param {Array}  components
 * @param {string} dataDir
 */
export function setCachedComponents(orgAlias, typeName, components, dataDir) {
  const store = getStore(dataDir);
  const existing = store.get(orgAlias) || {};
  const entry = {
    ...existing,
    lastRefresh: existing.lastRefresh || Date.now(),
    types: existing.types || null,
    components: {
      ...(existing.components || {}),
      [typeName]: components,
    },
  };
  store.set(orgAlias, entry);
  persistToDisk(dataDir, orgAlias);
}

/**
 * Removes all cached data for `orgAlias` — both in-memory and on disk.
 * Safe to call when the org has no cache entry.
 * @param {string} orgAlias
 * @param {string} dataDir
 */
export function clearOrgCache(orgAlias, dataDir) {
  getStore(dataDir).delete(orgAlias);

  const filePath = cacheFilePath(dataDir, orgAlias);
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
  }
}

/**
 * Returns true when the cache for `orgAlias` does not exist or its
 * `lastRefresh` timestamp is older than `ttlMs` milliseconds.
 * @param {string} orgAlias
 * @param {number} ttlMs    Milliseconds — default 1 hour.
 * @param {string} dataDir
 * @returns {boolean}
 */
export function isCacheStale(orgAlias, ttlMs = 60 * 60 * 1000, dataDir) {
  const entry = getStore(dataDir).get(orgAlias);
  if (!entry || typeof entry.lastRefresh !== 'number') return true;
  return Date.now() - entry.lastRefresh > ttlMs;
}
