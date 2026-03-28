import os from 'node:os';
import { getDb } from './db.js';

export function getCurrentUser() {
  return os.userInfo().username;
}

export function getStoredUsername() {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = 'username'").get();
  return row ? row.value : null;
}

export function setStoredUsername(name) {
  getDb().prepare(`
    INSERT OR REPLACE INTO settings (key, value) VALUES ('username', ?)
  `).run(name);
}

export function resolveUser() {
  return getStoredUsername() || getCurrentUser();
}
