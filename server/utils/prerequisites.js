import { execSync } from 'child_process'

/**
 * Checks system readiness for running the Salesforce Deploy Kit.
 * @returns {{ ok: boolean, checks: Array<{ name: string, status: 'pass'|'fail', message: string }> }}
 */
export function checkPrerequisites() {
  const checks = []

  // Check Node.js version >= 18
  const nodeVersion = process.version // e.g. "v20.11.0"
  const major = parseInt(nodeVersion.slice(1).split('.')[0], 10)
  if (major >= 18) {
    checks.push({ name: 'Node.js', status: 'pass', message: `Node.js ${nodeVersion} detected` })
  } else {
    checks.push({ name: 'Node.js', status: 'fail', message: `Node.js >= 18 required, found ${nodeVersion}` })
  }

  // Check Salesforce CLI
  try {
    const output = execSync('sf --version', { encoding: 'utf-8', timeout: 15000 }).trim()
    checks.push({ name: 'Salesforce CLI', status: 'pass', message: output })
  } catch {
    checks.push({
      name: 'Salesforce CLI',
      status: 'fail',
      message: 'Salesforce CLI (sf) not found. Install from https://developer.salesforce.com/tools/salesforcecli',
    })
  }

  const ok = checks.every((c) => c.status === 'pass')
  return { ok, checks }
}
