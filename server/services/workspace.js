import fs from 'node:fs';
import path from 'node:path';

const SFDX_PROJECT = {
  packageDirectories: [{ path: 'force-app', default: true }],
  namespace: '',
  sfdcLoginUrl: 'https://login.salesforce.com',
  sourceApiVersion: '62.0',
};

/**
 * Creates a workspace directory for a user + org combination.
 */
export function createWorkspace(username, orgAlias, baseDir) {
  const timestamp = Date.now();
  const id = `${orgAlias}-${timestamp}`;
  const wsPath = path.join(baseDir, 'workspaces', username, id);

  fs.mkdirSync(wsPath, { recursive: true });
  fs.mkdirSync(path.join(wsPath, 'force-app'), { recursive: true });
  fs.writeFileSync(
    path.join(wsPath, 'sfdx-project.json'),
    JSON.stringify(SFDX_PROJECT, null, 2),
  );

  return { id, path: wsPath };
}

/**
 * Returns workspace path by id, searching all user directories.
 */
export function getWorkspace(workspaceId, baseDir) {
  const wsRoot = path.join(baseDir, 'workspaces');
  if (!fs.existsSync(wsRoot)) return null;

  const users = fs.readdirSync(wsRoot);
  for (const user of users) {
    const candidate = path.join(wsRoot, user, workspaceId);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Lists workspaces for a given user.
 */
export function listWorkspaces(username, baseDir) {
  const userDir = path.join(baseDir, 'workspaces', username);
  if (!fs.existsSync(userDir)) return [];

  return fs.readdirSync(userDir)
    .filter(d => fs.statSync(path.join(userDir, d)).isDirectory())
    .map(id => ({
      id,
      path: path.join(userDir, id),
    }));
}

/**
 * Deletes workspaces older than maxAgeDays. Returns count of cleaned workspaces.
 */
export function cleanupOldWorkspaces(maxAgeDays = 30, baseDir) {
  const wsRoot = path.join(baseDir, 'workspaces');
  if (!fs.existsSync(wsRoot)) return 0;

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let cleaned = 0;

  const users = fs.readdirSync(wsRoot);
  for (const user of users) {
    const userDir = path.join(wsRoot, user);
    if (!fs.statSync(userDir).isDirectory()) continue;

    const dirs = fs.readdirSync(userDir);
    for (const dir of dirs) {
      const dirPath = path.join(userDir, dir);
      const stat = fs.statSync(dirPath);
      if (stat.isDirectory() && stat.mtimeMs < cutoff) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        cleaned++;
      }
    }
  }

  return cleaned;
}
