import fs from 'node:fs';
import path from 'node:path';

function bundlesDir(dataDir) {
  return path.join(dataDir, 'bundles');
}

/**
 * Lists all saved bundles.
 */
export function listBundles(dataDir) {
  const dir = bundlesDir(dataDir);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Gets a single bundle by name.
 */
export function getBundle(name, dataDir) {
  const filePath = path.join(bundlesDir(dataDir), `${name}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Saves a bundle.
 */
export function saveBundle(name, components, dataDir) {
  const dir = bundlesDir(dataDir);
  fs.mkdirSync(dir, { recursive: true });

  const bundle = { name, components, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(bundle, null, 2));
  return bundle;
}

/**
 * Deletes a bundle by name.
 */
export function deleteBundle(name, dataDir) {
  const filePath = path.join(bundlesDir(dataDir), `${name}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}
