import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeRecord, readRecords, readRecord, archiveOldRecords } from '../services/history.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'history-test-'));
}

function makeRecord(overrides = {}) {
  return {
    id: `deploy-${Date.now()}-abc`,
    type: 'deploy',
    user: 'john.smith',
    sourceOrg: 'Dev Sandbox',
    targetOrg: 'Production',
    components: ['Flow:Lead_Assignment_Flow', 'CustomField:Account.Industry__c'],
    componentCount: 2,
    status: 'success',
    errors: [],
    startedAt: '2026-03-24T14:30:00Z',
    completedAt: '2026-03-24T14:30:24Z',
    duration: 24,
    rollbackId: 'rollback-1711300000-abc',
    ...overrides,
  };
}

describe('history service', () => {
  let dataDir;

  beforeEach(() => {
    dataDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('writeRecord', () => {
    it('creates history directory and writes JSON file', () => {
      const record = makeRecord({ id: 'deploy-001' });
      writeRecord(record, dataDir);

      const filePath = path.join(dataDir, 'history', 'deploy-001.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const stored = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(stored.id).toBe('deploy-001');
      expect(stored.user).toBe('john.smith');
    });
  });

  describe('readRecord', () => {
    it('reads a single record by id', () => {
      const record = makeRecord({ id: 'deploy-002' });
      writeRecord(record, dataDir);

      const result = readRecord('deploy-002', dataDir);
      expect(result.id).toBe('deploy-002');
      expect(result.status).toBe('success');
    });

    it('returns null for non-existent record', () => {
      const result = readRecord('nonexistent', dataDir);
      expect(result).toBeNull();
    });
  });

  describe('readRecords', () => {
    it('returns all records sorted by startedAt descending', () => {
      writeRecord(makeRecord({ id: 'r1', startedAt: '2026-03-01T00:00:00Z' }), dataDir);
      writeRecord(makeRecord({ id: 'r3', startedAt: '2026-03-03T00:00:00Z' }), dataDir);
      writeRecord(makeRecord({ id: 'r2', startedAt: '2026-03-02T00:00:00Z' }), dataDir);

      const results = readRecords({}, dataDir);
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('r3');
      expect(results[1].id).toBe('r2');
      expect(results[2].id).toBe('r1');
    });

    it('filters by user', () => {
      writeRecord(makeRecord({ id: 'r1', user: 'alice' }), dataDir);
      writeRecord(makeRecord({ id: 'r2', user: 'bob' }), dataDir);

      const results = readRecords({ user: 'alice' }, dataDir);
      expect(results).toHaveLength(1);
      expect(results[0].user).toBe('alice');
    });

    it('filters by status', () => {
      writeRecord(makeRecord({ id: 'r1', status: 'success' }), dataDir);
      writeRecord(makeRecord({ id: 'r2', status: 'failed' }), dataDir);

      const results = readRecords({ status: 'failed' }, dataDir);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
    });

    it('filters by org', () => {
      writeRecord(makeRecord({ id: 'r1', targetOrg: 'Production' }), dataDir);
      writeRecord(makeRecord({ id: 'r2', targetOrg: 'Staging' }), dataDir);

      const results = readRecords({ org: 'Staging' }, dataDir);
      expect(results).toHaveLength(1);
      expect(results[0].targetOrg).toBe('Staging');
    });

    it('filters by date range (from/to)', () => {
      writeRecord(makeRecord({ id: 'r1', startedAt: '2026-03-01T00:00:00Z' }), dataDir);
      writeRecord(makeRecord({ id: 'r2', startedAt: '2026-03-15T00:00:00Z' }), dataDir);
      writeRecord(makeRecord({ id: 'r3', startedAt: '2026-03-28T00:00:00Z' }), dataDir);

      const results = readRecords({
        from: '2026-03-10T00:00:00Z',
        to: '2026-03-20T00:00:00Z',
      }, dataDir);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('r2');
    });

    it('tolerates corrupt JSON files gracefully', () => {
      writeRecord(makeRecord({ id: 'r1' }), dataDir);

      // Write a corrupt file
      const histDir = path.join(dataDir, 'history');
      fs.writeFileSync(path.join(histDir, 'corrupt.json'), '{ broken json !!!');
      // Write an empty file
      fs.writeFileSync(path.join(histDir, 'empty.json'), '');

      const results = readRecords({}, dataDir);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('r1');
    });

    it('returns empty array when history directory does not exist', () => {
      const results = readRecords({}, dataDir);
      expect(results).toEqual([]);
    });
  });

  describe('archiveOldRecords', () => {
    it('moves old records to archive directory', () => {
      const histDir = path.join(dataDir, 'history');
      fs.mkdirSync(histDir, { recursive: true });

      // Write an old record (200 days ago)
      const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
      const oldRecord = makeRecord({ id: 'old-record', startedAt: oldDate });
      fs.writeFileSync(path.join(histDir, 'old-record.json'), JSON.stringify(oldRecord));

      // Write a recent record
      const recentRecord = makeRecord({ id: 'recent-record', startedAt: new Date().toISOString() });
      fs.writeFileSync(path.join(histDir, 'recent-record.json'), JSON.stringify(recentRecord));

      const archived = archiveOldRecords(dataDir, 180);

      // Old record should be in archive
      expect(fs.existsSync(path.join(histDir, 'archive', 'old-record.json'))).toBe(true);
      expect(fs.existsSync(path.join(histDir, 'old-record.json'))).toBe(false);

      // Recent record should still be in place
      expect(fs.existsSync(path.join(histDir, 'recent-record.json'))).toBe(true);

      expect(archived).toHaveLength(1);
      expect(archived[0]).toBe('old-record.json');
    });
  });
});
