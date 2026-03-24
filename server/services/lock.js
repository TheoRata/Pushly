import fs from 'node:fs';
import path from 'node:path';

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Acquires a deploy lock for an org.
 */
export function acquireLock(orgAlias, user, components, dataDir) {
  const existing = checkLock(orgAlias, dataDir);
  if (existing) {
    return { acquired: false, existingLock: existing };
  }

  const lockData = {
    user,
    orgAlias,
    startedAt: new Date().toISOString(),
    components,
    pid: process.pid,
  };

  fs.mkdirSync(dataDir, { recursive: true });
  const lockPath = path.join(dataDir, `${orgAlias}.deploy.lock`);
  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));

  return { acquired: true };
}

/**
 * Releases a deploy lock for an org.
 */
export function releaseLock(orgAlias, dataDir) {
  const lockPath = path.join(dataDir, `${orgAlias}.deploy.lock`);
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
}

/**
 * Checks if a lock exists and is not stale.
 * Returns lock data or null.
 */
export function checkLock(orgAlias, dataDir) {
  const lockPath = path.join(dataDir, `${orgAlias}.deploy.lock`);
  if (!fs.existsSync(lockPath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
    const age = Date.now() - new Date(data.startedAt).getTime();
    if (age > STALE_THRESHOLD_MS) {
      // Stale lock — clean it up
      fs.unlinkSync(lockPath);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Finds and deletes all stale lock files (older than 30 minutes).
 */
export function cleanupStaleLocks(dataDir) {
  if (!fs.existsSync(dataDir)) return 0;

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.deploy.lock'));
  let cleaned = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const age = Date.now() - new Date(data.startedAt).getTime();
      if (age > STALE_THRESHOLD_MS) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    } catch {
      // Corrupt lock file — remove it
      fs.unlinkSync(filePath);
      cleaned++;
    }
  }

  return cleaned;
}
