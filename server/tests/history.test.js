import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, closeDb } from '../services/db.js';
import { writeRecord, readRecords, readRecord, archiveOldRecords } from '../services/history.js';

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
  beforeEach(() => {
    initDb(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  describe('writeRecord', () => {
    it('writes a record to the database', () => {
      const record = makeRecord({ id: 'deploy-001' });
      writeRecord(record);

      const result = readRecord('deploy-001');
      expect(result).not.toBeNull();
      expect(result.id).toBe('deploy-001');
      expect(result.user).toBe('john.smith');
    });
  });

  describe('readRecord', () => {
    it('reads a single record by id', () => {
      const record = makeRecord({ id: 'deploy-002' });
      writeRecord(record);

      const result = readRecord('deploy-002');
      expect(result.id).toBe('deploy-002');
      expect(result.status).toBe('success');
    });

    it('returns null for non-existent record', () => {
      const result = readRecord('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('readRecords', () => {
    it('returns all records sorted by startedAt descending', () => {
      writeRecord(makeRecord({ id: 'r1', startedAt: '2026-03-01T00:00:00Z' }));
      writeRecord(makeRecord({ id: 'r3', startedAt: '2026-03-03T00:00:00Z' }));
      writeRecord(makeRecord({ id: 'r2', startedAt: '2026-03-02T00:00:00Z' }));

      const results = readRecords({});
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('r3');
      expect(results[1].id).toBe('r2');
      expect(results[2].id).toBe('r1');
    });

    it('filters by user', () => {
      writeRecord(makeRecord({ id: 'r1', user: 'alice' }));
      writeRecord(makeRecord({ id: 'r2', user: 'bob' }));

      const results = readRecords({ user: 'alice' });
      expect(results).toHaveLength(1);
      expect(results[0].user).toBe('alice');
    });

    it('filters by status', () => {
      writeRecord(makeRecord({ id: 'r1', status: 'success' }));
      writeRecord(makeRecord({ id: 'r2', status: 'failed' }));

      const results = readRecords({ status: 'failed' });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
    });

    it('filters by org', () => {
      writeRecord(makeRecord({ id: 'r1', targetOrg: 'Production' }));
      writeRecord(makeRecord({ id: 'r2', targetOrg: 'Staging' }));

      const results = readRecords({ org: 'Staging' });
      expect(results).toHaveLength(1);
      expect(results[0].targetOrg).toBe('Staging');
    });

    it('filters by date range (from/to)', () => {
      writeRecord(makeRecord({ id: 'r1', startedAt: '2026-03-01T00:00:00Z' }));
      writeRecord(makeRecord({ id: 'r2', startedAt: '2026-03-15T00:00:00Z' }));
      writeRecord(makeRecord({ id: 'r3', startedAt: '2026-03-28T00:00:00Z' }));

      const results = readRecords({
        from: '2026-03-10T00:00:00Z',
        to: '2026-03-20T00:00:00Z',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('r2');
    });

    it('returns empty array when no records exist', () => {
      const results = readRecords({});
      expect(results).toEqual([]);
    });
  });

  describe('archiveOldRecords', () => {
    it('deletes old records and returns count', () => {
      // Write an old record (200 days ago)
      const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
      writeRecord(makeRecord({ id: 'old-record', startedAt: oldDate }));

      // Write a recent record
      writeRecord(makeRecord({ id: 'recent-record', startedAt: new Date().toISOString() }));

      const deletedCount = archiveOldRecords(180);

      // Should have deleted 1 old record
      expect(deletedCount).toBe(1);

      // Old record should be gone
      expect(readRecord('old-record')).toBeNull();

      // Recent record should still exist
      expect(readRecord('recent-record')).not.toBeNull();
    });
  });
});
