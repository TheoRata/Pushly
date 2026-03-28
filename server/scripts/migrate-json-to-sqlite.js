#!/usr/bin/env node
import fs from 'node:fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDb, getDb, closeDb } from '../services/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baseDir = join(__dirname, '..', '..');
const dataDir = process.env.PUSHLY_DATA_DIR || join(baseDir, 'data');
const dbPath = join(dataDir, 'pushly.db');

console.log(`Migrating JSON data to SQLite at ${dbPath}`);
initDb(dbPath);
const db = getDb();

let migrated = { history: 0, bundles: 0, username: 0 };

// --- History records ---
const histDir = join(dataDir, 'history');
if (fs.existsSync(histDir)) {
  const files = fs.readdirSync(histDir).filter(f => f.endsWith('.json'));
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO operations
      (id, type, name, user, source_org, target_org, components, workspace_id,
       workspace_path, snapshot_path, retry_of, rollback_of, mode, status,
       error, result, failed_components, started_at, completed_at)
    VALUES
      (@id, @type, @name, @user, @sourceOrg, @targetOrg, @components, @workspaceId,
       @workspacePath, @snapshotPath, @retryOf, @rollbackOf, @mode, @status,
       @error, @result, @failedComponents, @startedAt, @completedAt)
  `);

  for (const file of files) {
    try {
      const content = fs.readFileSync(join(histDir, file), 'utf-8');
      if (!content.trim()) continue;
      const r = JSON.parse(content);
      stmt.run({
        id: r.id,
        type: r.type || 'deploy',
        name: r.name || null,
        user: r.user || 'unknown',
        sourceOrg: r.sourceOrg || null,
        targetOrg: r.targetOrg || null,
        components: JSON.stringify(r.components || []),
        workspaceId: r.workspaceId || null,
        workspacePath: r.workspacePath || null,
        snapshotPath: r.snapshotDir || r.snapshotPath || null,
        retryOf: r.retryOf || null,
        rollbackOf: r.rollbackOf || null,
        mode: r.mode || null,
        status: r.status || 'unknown',
        error: r.error || null,
        result: r.result ? JSON.stringify(r.result) : null,
        failedComponents: r.failedComponents ? JSON.stringify(r.failedComponents) : null,
        startedAt: r.startedAt || new Date().toISOString(),
        completedAt: r.completedAt || null,
      });
      migrated.history++;
    } catch (err) {
      console.warn(`  Skipping corrupt file: ${file} (${err.message})`);
    }
  }
}

// --- Bundles ---
const bundlesDir = join(dataDir, 'bundles');
if (fs.existsSync(bundlesDir)) {
  const files = fs.readdirSync(bundlesDir).filter(f => f.endsWith('.json'));
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO bundles (name, components, created_at)
    VALUES (?, ?, ?)
  `);

  for (const file of files) {
    try {
      const b = JSON.parse(fs.readFileSync(join(bundlesDir, file), 'utf-8'));
      stmt.run(b.name, JSON.stringify(b.components), b.createdAt || new Date().toISOString());
      migrated.bundles++;
    } catch (err) {
      console.warn(`  Skipping corrupt bundle: ${file} (${err.message})`);
    }
  }
}

// --- Username ---
const usernamePath = join(dataDir, '.username');
if (fs.existsSync(usernamePath)) {
  const name = fs.readFileSync(usernamePath, 'utf-8').trim();
  if (name) {
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('username', ?)").run(name);
    migrated.username = 1;
  }
}

closeDb();

console.log(`Migration complete:`);
console.log(`  History records: ${migrated.history}`);
console.log(`  Bundles: ${migrated.bundles}`);
console.log(`  Username: ${migrated.username ? 'migrated' : 'none found'}`);
