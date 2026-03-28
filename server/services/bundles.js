import { getDb } from './db.js';

export function listBundles() {
  const rows = getDb().prepare('SELECT * FROM bundles ORDER BY created_at DESC').all();
  return rows.map(rowToBundle);
}

export function getBundle(name) {
  const row = getDb().prepare('SELECT * FROM bundles WHERE name = ?').get(name);
  return row ? rowToBundle(row) : null;
}

export function saveBundle(name, components) {
  const bundle = { name, components, createdAt: new Date().toISOString() };
  getDb().prepare(`
    INSERT OR REPLACE INTO bundles (name, components, created_at)
    VALUES (?, ?, ?)
  `).run(name, JSON.stringify(components), bundle.createdAt);
  return bundle;
}

export function deleteBundle(name) {
  const result = getDb().prepare('DELETE FROM bundles WHERE name = ?').run(name);
  return result.changes > 0;
}

function rowToBundle(row) {
  return {
    name: row.name,
    components: JSON.parse(row.components),
    createdAt: row.created_at,
  };
}
