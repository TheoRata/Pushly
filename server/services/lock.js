import { getDb } from './db.js';

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Acquires a deploy lock for an org.
 */
export function acquireLock(orgAlias, user, components) {
  const db = getDb();
  const existing = checkLock(orgAlias);
  if (existing) {
    return { acquired: false, existingLock: existing };
  }
  db.prepare(`
    INSERT OR REPLACE INTO deploy_locks (org_alias, user, components, pid, started_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(orgAlias, user, JSON.stringify(components), process.pid, new Date().toISOString());
  return { acquired: true };
}

/**
 * Releases a deploy lock for an org.
 */
export function releaseLock(orgAlias) {
  getDb().prepare('DELETE FROM deploy_locks WHERE org_alias = ?').run(orgAlias);
}

/**
 * Checks if a lock exists and is not stale.
 * Returns lock data or null.
 */
export function checkLock(orgAlias) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM deploy_locks WHERE org_alias = ?').get(orgAlias);
  if (!row) return null;

  const age = Date.now() - new Date(row.started_at).getTime();
  if (age > STALE_THRESHOLD_MS) {
    db.prepare('DELETE FROM deploy_locks WHERE org_alias = ?').run(orgAlias);
    return null;
  }

  return {
    user: row.user,
    orgAlias: row.org_alias,
    startedAt: row.started_at,
    components: jsonParse(row.components, []),
    pid: row.pid,
  };
}

/**
 * Finds and deletes all stale locks (older than 30 minutes).
 */
export function cleanupStaleLocks() {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const result = getDb().prepare('DELETE FROM deploy_locks WHERE started_at < ?').run(cutoff);
  return result.changes;
}

function jsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
