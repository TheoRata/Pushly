import { getDb } from './db.js';

/**
 * Writes (upserts) a deployment history record to SQLite.
 */
export function writeRecord(record) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO operations
      (id, type, name, user, source_org, target_org, components, workspace_id,
       workspace_path, snapshot_path, retry_of, rollback_of, mode, status,
       error, result, failed_components, started_at, completed_at)
    VALUES
      (@id, @type, @name, @user, @sourceOrg, @targetOrg, @components, @workspaceId,
       @workspacePath, @snapshotPath, @retryOf, @rollbackOf, @mode, @status,
       @error, @result, @failedComponents, @startedAt, @completedAt)
  `);

  stmt.run({
    id: record.id,
    type: record.type || 'deploy',
    name: record.name || null,
    user: record.user,
    sourceOrg: record.sourceOrg || null,
    targetOrg: record.targetOrg || null,
    components: JSON.stringify(record.components || []),
    workspaceId: record.workspaceId || null,
    workspacePath: record.workspacePath || null,
    snapshotPath: record.snapshotDir || record.snapshotPath || null,
    retryOf: record.retryOf || null,
    rollbackOf: record.rollbackOf || null,
    mode: record.mode || null,
    status: record.status,
    error: record.error || null,
    result: record.result ? JSON.stringify(record.result) : null,
    failedComponents: record.failedComponents ? JSON.stringify(record.failedComponents) : null,
    startedAt: record.startedAt,
    completedAt: record.completedAt || null,
  });
}

/**
 * Reads all history records, with optional filtering.
 * Returns records sorted by startedAt descending.
 */
export function readRecords(filters = {}) {
  const db = getDb();
  const conditions = [];
  const params = {};

  if (filters.user) { conditions.push('user = @user'); params.user = filters.user; }
  if (filters.status) { conditions.push('status = @status'); params.status = filters.status; }
  if (filters.org) { conditions.push('(source_org = @org OR target_org = @org)'); params.org = filters.org; }
  if (filters.from) { conditions.push('started_at >= @from'); params.from = filters.from; }
  if (filters.to) { conditions.push('started_at <= @to'); params.to = filters.to; }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM operations ${where} ORDER BY started_at DESC`).all(params);
  return rows.map(rowToRecord);
}

/**
 * Reads a single history record by id.
 */
export function readRecord(id) {
  const row = getDb().prepare('SELECT * FROM operations WHERE id = ?').get(id);
  return row ? rowToRecord(row) : null;
}

/**
 * Deletes records older than maxAgeDays.
 * Returns the number of deleted records.
 */
export function archiveOldRecords(maxAgeDays = 180) {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const result = getDb().prepare('DELETE FROM operations WHERE started_at < ?').run(cutoff);
  return result.changes;
}

function rowToRecord(row) {
  return {
    id: row.id, type: row.type, name: row.name, user: row.user,
    sourceOrg: row.source_org, targetOrg: row.target_org,
    components: jsonParse(row.components, []),
    workspaceId: row.workspace_id, workspacePath: row.workspace_path,
    snapshotDir: row.snapshot_path, retryOf: row.retry_of, rollbackOf: row.rollback_of,
    mode: row.mode, status: row.status, error: row.error,
    result: jsonParse(row.result, null),
    failedComponents: jsonParse(row.failed_components, null),
    startedAt: row.started_at, completedAt: row.completed_at,
  };
}

function jsonParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}
