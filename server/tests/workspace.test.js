import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createWorkspace, getWorkspace, listWorkspaces, cleanupOldWorkspaces } from '../services/workspace.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-test-'));
}

describe('workspace service', () => {
  let baseDir;

  beforeEach(() => {
    baseDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  describe('createWorkspace', () => {
    it('creates workspace directory with sfdx-project.json', () => {
      const result = createWorkspace('john', 'DevSandbox', baseDir, 'My Retrieve');

      expect(result.id).toBeTruthy();
      expect(result.path).toBeTruthy();
      expect(fs.existsSync(result.path)).toBe(true);

      const sfdxPath = path.join(result.path, 'sfdx-project.json');
      expect(fs.existsSync(sfdxPath)).toBe(true);

      const sfdx = JSON.parse(fs.readFileSync(sfdxPath, 'utf-8'));
      expect(sfdx.packageDirectories[0].path).toBe('force-app');
      expect(sfdx.sourceApiVersion).toBe('62.0');
    });

    it('creates force-app directory', () => {
      const result = createWorkspace('john', 'DevSandbox', baseDir, 'Test');
      expect(fs.existsSync(path.join(result.path, 'force-app'))).toBe(true);
    });

    it('creates workspace under user subdirectory', () => {
      const result = createWorkspace('john', 'DevSandbox', baseDir, 'My Flow Updates');
      expect(result.path).toContain(path.join('workspaces', 'john'));
    });

    it('uses sanitised name as directory when name is provided', () => {
      const result = createWorkspace('john', 'DevSandbox', baseDir, 'Flow Updates March!');
      expect(result.id).toBe('flow-updates-march');
    });

    it('falls back to orgAlias-timestamp when name is not provided', () => {
      const result = createWorkspace('john', 'DevSandbox', baseDir);
      expect(result.id).toMatch(/^DevSandbox-\d+$/);
    });

    it('handles collision by appending counter', () => {
      const first = createWorkspace('john', 'Dev', baseDir, 'My Retrieve');
      const second = createWorkspace('john', 'Dev', baseDir, 'My Retrieve');

      expect(first.id).toBe('my-retrieve');
      expect(second.id).toBe('my-retrieve-2');
      expect(fs.existsSync(first.path)).toBe(true);
      expect(fs.existsSync(second.path)).toBe(true);
    });

    it('sanitises special characters from name', () => {
      const result = createWorkspace('john', 'Dev', baseDir, '  Hello!! World @#$ 123  ');
      expect(result.id).toBe('hello-world-123');
    });

    it('falls back to "workspace" when name sanitises to empty', () => {
      const result = createWorkspace('john', 'Dev', baseDir, '!!!');
      expect(result.id).toBe('workspace');
    });
  });

  describe('getWorkspace', () => {
    it('returns workspace path for valid id', () => {
      const created = createWorkspace('john', 'DevSandbox', baseDir, 'Test Retrieve');
      const wsPath = getWorkspace(created.id, baseDir);
      expect(wsPath).toBe(created.path);
    });

    it('returns null for non-existent workspace', () => {
      const wsPath = getWorkspace('nonexistent', baseDir);
      expect(wsPath).toBeNull();
    });
  });

  describe('listWorkspaces', () => {
    it('lists workspaces for a user', () => {
      createWorkspace('john', 'DevSandbox', baseDir, 'First Retrieve');
      createWorkspace('john', 'Production', baseDir, 'Second Retrieve');
      createWorkspace('alice', 'DevSandbox', baseDir, 'Alice Retrieve');

      const johnWorkspaces = listWorkspaces('john', baseDir);
      expect(johnWorkspaces).toHaveLength(2);

      const aliceWorkspaces = listWorkspaces('alice', baseDir);
      expect(aliceWorkspaces).toHaveLength(1);
    });

    it('returns empty array for user with no workspaces', () => {
      const result = listWorkspaces('nobody', baseDir);
      expect(result).toEqual([]);
    });
  });

  describe('cleanupOldWorkspaces', () => {
    it('deletes workspaces older than maxAgeDays', () => {
      const ws = createWorkspace('john', 'OldOrg', baseDir, 'Old Retrieve');

      // Backdate the workspace directory mtime
      const oldTime = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      fs.utimesSync(ws.path, oldTime, oldTime);

      const recent = createWorkspace('john', 'NewOrg', baseDir, 'New Retrieve');

      const cleaned = cleanupOldWorkspaces(30, baseDir);
      expect(cleaned).toBeGreaterThanOrEqual(1);

      expect(fs.existsSync(ws.path)).toBe(false);
      expect(fs.existsSync(recent.path)).toBe(true);
    });
  });
});
