import fs from 'node:fs';
import path from 'node:path';

/**
 * Creates a snapshot directory for a deployment (pre-deploy backup).
 */
export function createSnapshot(deployId, components, dataDir) {
  const snapshotDir = path.join(dataDir, 'rollbacks', deployId);
  fs.mkdirSync(snapshotDir, { recursive: true });

  // Write manifest of components being backed up
  fs.writeFileSync(
    path.join(snapshotDir, 'manifest.json'),
    JSON.stringify({ deployId, components, createdAt: new Date().toISOString() }, null, 2),
  );

  return snapshotDir;
}

/**
 * Returns the snapshot directory path for a deployment.
 */
export function getRollbackPath(deployId, dataDir) {
  const snapshotDir = path.join(dataDir, 'rollbacks', deployId);
  if (!fs.existsSync(snapshotDir)) return null;
  return snapshotDir;
}

/**
 * Deletes snapshots older than maxAgeDays.
 */
export function cleanupOldSnapshots(maxAgeDays = 90, dataDir) {
  const rollbacksDir = path.join(dataDir, 'rollbacks');
  if (!fs.existsSync(rollbacksDir)) return 0;

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let cleaned = 0;

  const dirs = fs.readdirSync(rollbacksDir);
  for (const dir of dirs) {
    const dirPath = path.join(rollbacksDir, dir);
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory() && stat.mtimeMs < cutoff) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      cleaned++;
    }
  }

  return cleaned;
}
