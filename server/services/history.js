import fs from 'node:fs';
import path from 'node:path';

/**
 * Writes a deployment history record as a JSON file.
 */
export function writeRecord(record, dataDir) {
  const histDir = path.join(dataDir, 'history');
  fs.mkdirSync(histDir, { recursive: true });
  const filePath = path.join(histDir, `${record.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
}

/**
 * Reads all history records, with optional filtering.
 * Tolerates corrupt/partial JSON files (OneDrive sync tolerance).
 */
export function readRecords(filters = {}, dataDir) {
  const histDir = path.join(dataDir, 'history');
  if (!fs.existsSync(histDir)) return [];

  const files = fs.readdirSync(histDir).filter(f => f.endsWith('.json'));
  const records = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(histDir, file), 'utf-8');
      if (!content.trim()) continue;
      const record = JSON.parse(content);
      records.push(record);
    } catch {
      // Skip corrupt or partial JSON files
      continue;
    }
  }

  // Apply filters
  let filtered = records;

  if (filters.user) {
    filtered = filtered.filter(r => r.user === filters.user);
  }
  if (filters.status) {
    filtered = filtered.filter(r => r.status === filters.status);
  }
  if (filters.org) {
    filtered = filtered.filter(r => r.sourceOrg === filters.org || r.targetOrg === filters.org);
  }
  if (filters.from) {
    const fromDate = new Date(filters.from);
    filtered = filtered.filter(r => new Date(r.startedAt) >= fromDate);
  }
  if (filters.to) {
    const toDate = new Date(filters.to);
    filtered = filtered.filter(r => new Date(r.startedAt) <= toDate);
  }

  // Sort by startedAt descending
  filtered.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  return filtered;
}

/**
 * Reads a single history record by id.
 */
export function readRecord(id, dataDir) {
  const filePath = path.join(dataDir, 'history', `${id}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Archives records older than maxAgeDays to history/archive/.
 */
export function archiveOldRecords(dataDir, maxAgeDays = 180) {
  const histDir = path.join(dataDir, 'history');
  if (!fs.existsSync(histDir)) return [];

  const archiveDir = path.join(histDir, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(histDir).filter(f => f.endsWith('.json'));
  const archived = [];

  for (const file of files) {
    const filePath = path.join(histDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const record = JSON.parse(content);
      if (new Date(record.startedAt).getTime() < cutoff) {
        fs.renameSync(filePath, path.join(archiveDir, file));
        archived.push(file);
      }
    } catch {
      continue;
    }
  }

  return archived;
}
