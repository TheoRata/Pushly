import Database from 'better-sqlite3';

let db = null;

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT,
      user TEXT NOT NULL,
      source_org TEXT,
      target_org TEXT,
      components TEXT,
      workspace_id TEXT,
      workspace_path TEXT,
      snapshot_path TEXT,
      retry_of TEXT,
      rollback_of TEXT,
      mode TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      error TEXT,
      result TEXT,
      failed_components TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_operations_user ON operations(user);
    CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
    CREATE INDEX IF NOT EXISTS idx_operations_started_at ON operations(started_at);

    CREATE TABLE IF NOT EXISTS deploy_locks (
      org_alias TEXT PRIMARY KEY,
      user TEXT NOT NULL,
      components TEXT,
      pid INTEGER,
      started_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bundles (
      name TEXT PRIMARY KEY,
      components TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metadata_cache (
      org_alias TEXT NOT NULL,
      type_name TEXT NOT NULL,
      data TEXT NOT NULL,
      last_refresh INTEGER NOT NULL,
      PRIMARY KEY (org_alias, type_name)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export function initDb(dbPath = 'pushly.db') {
  if (db) {
    return db;
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createSchema();

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
