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
      const result = createWorkspace('john', 'DevSandbox', baseDir);

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
      const result = createWorkspace('john', 'DevSandbox', baseDir);
      expect(fs.existsSync(path.join(result.path, 'force-app'))).toBe(true);
    });

    it('creates workspace under user subdirectory', () => {
      const result = createWorkspace('john', 'DevSandbox', baseDir);
      expect(result.path).toContain(path.join('workspaces', 'john'));
      expect(result.path).toContain('DevSandbox');
    });
  });

  describe('getWorkspace', () => {
    it('returns workspace path for valid id', () => {
      const created = createWorkspace('john', 'DevSandbox', baseDir);
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
      createWorkspace('john', 'DevSandbox', baseDir);
      createWorkspace('john', 'Production', baseDir);
      createWorkspace('alice', 'DevSandbox', baseDir);

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
      const ws = createWorkspace('john', 'OldOrg', baseDir);

      // Backdate the workspace directory mtime
      const oldTime = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      fs.utimesSync(ws.path, oldTime, oldTime);

      const recent = createWorkspace('john', 'NewOrg', baseDir);

      const cleaned = cleanupOldWorkspaces(30, baseDir);
      expect(cleaned).toBeGreaterThanOrEqual(1);

      expect(fs.existsSync(ws.path)).toBe(false);
      expect(fs.existsSync(recent.path)).toBe(true);
    });
  });
});
