import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Returns the current OS username.
 */
export function getCurrentUser() {
  return os.userInfo().username;
}

/**
 * Reads stored username from data/.username.
 */
export function getStoredUsername(dataDir) {
  const filePath = path.join(dataDir, '.username');
  if (!fs.existsSync(filePath)) return null;

  try {
    const name = fs.readFileSync(filePath, 'utf-8').trim();
    return name || null;
  } catch {
    return null;
  }
}

/**
 * Writes username to data/.username.
 */
export function setStoredUsername(name, dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, '.username'), name);
}

/**
 * Returns stored username, or falls back to OS username.
 */
export function resolveUser(dataDir) {
  return getStoredUsername(dataDir) || getCurrentUser();
}
