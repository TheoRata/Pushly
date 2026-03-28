import { getDb } from './db.js';

const TYPES_KEY = '__types__';

export function initCache() {
  // No-op — SQLite tables created by db.js
}

export function getCachedTypes(orgAlias) {
  const row = getDb()
    .prepare('SELECT data FROM metadata_cache WHERE org_alias = ? AND type_name = ?')
    .get(orgAlias, TYPES_KEY);
  return row ? JSON.parse(row.data) : null;
}

export function setCachedTypes(orgAlias, types) {
  getDb().prepare(`
    INSERT OR REPLACE INTO metadata_cache (org_alias, type_name, data, last_refresh)
    VALUES (?, ?, ?, ?)
  `).run(orgAlias, TYPES_KEY, JSON.stringify(types), Date.now());
}

export function getCachedComponents(orgAlias, typeName) {
  const row = getDb()
    .prepare('SELECT data FROM metadata_cache WHERE org_alias = ? AND type_name = ?')
    .get(orgAlias, typeName);
  return row ? JSON.parse(row.data) : null;
}

export function setCachedComponents(orgAlias, typeName, components) {
  getDb().prepare(`
    INSERT OR REPLACE INTO metadata_cache (org_alias, type_name, data, last_refresh)
    VALUES (?, ?, ?, ?)
  `).run(orgAlias, typeName, JSON.stringify(components), Date.now());
}

export function clearOrgCache(orgAlias) {
  getDb().prepare('DELETE FROM metadata_cache WHERE org_alias = ?').run(orgAlias);
}

export function isCacheStale(orgAlias, ttlMs = 60 * 60 * 1000) {
  const row = getDb()
    .prepare('SELECT last_refresh FROM metadata_cache WHERE org_alias = ? AND type_name = ? LIMIT 1')
    .get(orgAlias, TYPES_KEY);
  if (!row) return true;
  return Date.now() - row.last_refresh > ttlMs;
}
