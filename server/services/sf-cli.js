import { spawn } from 'child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { translateError } from '../utils/error-translator.js'

/**
 * Runs an sf command with --json flag, returns parsed result.
 * @param {string[]} args - CLI arguments (without 'sf' prefix)
 * @param {object} options - Optional spawn options
 * @param {string} options.cwd - Working directory
 * @param {number} options.timeout - Timeout in ms (default 120000)
 * @returns {Promise<any>} Parsed JSON result
 */
export async function sfCommand(args, options = {}) {
  const { cwd, timeout = 120_000 } = options
  const fullArgs = [...args]
  if (!fullArgs.includes('--json')) {
    fullArgs.push('--json')
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('sf', fullArgs, {
      cwd,
      timeout,
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.on('error', (err) => {
      reject({
        ...translateError(err.message),
        stderr: err.message,
      })
    })

    proc.on('close', (code) => {
      // Try to parse JSON from stdout
      let parsed
      try {
        parsed = JSON.parse(stdout)
      } catch {
        // sf --version --json may output plain text
        if (code === 0) {
          resolve(stdout.trim())
          return
        }
        const raw = stderr || stdout || `sf exited with code ${code}`
        reject({ ...translateError(raw), stderr: raw })
        return
      }

      if (code === 0) {
        resolve(parsed.result !== undefined ? parsed.result : parsed)
      } else {
        // Extract component failures for deploy/validate errors
        const result = parsed.result || {}
        const details = result.details || {}
        let cfRaw = details.componentFailures || []
        if (!Array.isArray(cfRaw)) cfRaw = [cfRaw]
        cfRaw = cfRaw.filter(Boolean)

        // Build a human-readable error message
        let errorMsg = parsed.message || parsed.name || ''
        if (!errorMsg && cfRaw.length > 0) {
          const problems = cfRaw.slice(0, 3).map((f) =>
            `${f.componentType || ''}:${f.fullName || ''} — ${f.problem || ''}`
          )
          errorMsg = `${cfRaw.length} component error${cfRaw.length !== 1 ? 's' : ''}:\n${problems.join('\n')}`
          if (cfRaw.length > 3) errorMsg += `\n...and ${cfRaw.length - 3} more`
        }
        if (!errorMsg) errorMsg = stderr || `sf exited with code ${code}`

        reject({ ...translateError(errorMsg), stderr, result: parsed })
      }
    })
  })
}

/**
 * Runs an sf command and streams stdout line-by-line via callback.
 * @param {string[]} args - CLI arguments (without 'sf' prefix)
 * @param {function(string): void} onData - Called for each line of stdout
 * @param {object} options - Optional spawn options
 * @returns {Promise<number>} Exit code
 */
export async function sfCommandStream(args, onData, options = {}) {
  const { cwd, timeout = 120_000 } = options

  return new Promise((resolve, reject) => {
    const proc = spawn('sf', args, {
      cwd,
      timeout,
      env: { ...process.env },
    })

    let buffer = ''

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() // Keep incomplete last line in buffer
      for (const line of lines) {
        if (line.trim()) onData(line)
      }
    })

    proc.stderr.on('data', (chunk) => {
      const lines = chunk.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) onData(line)
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })

    proc.on('close', (code) => {
      // Flush remaining buffer
      if (buffer.trim()) onData(buffer)
      resolve(code)
    })
  })
}

// ── Specific wrapper functions ──────────────────────────────────────

export async function listOrgs() {
  return sfCommand(['org', 'list'])
}

export async function orgDisplay(alias) {
  return sfCommand(['org', 'display', '--target-org', alias])
}

export async function orgLoginWeb(alias, instanceUrl) {
  const args = ['org', 'login', 'web', '--alias', alias]
  if (instanceUrl) args.push('--instance-url', instanceUrl)

  // Do NOT use sfCommand here — it adds --json which can break
  // the interactive OAuth browser flow. Run sf CLI directly and
  // wait for the process to exit (OAuth callback completes).
  return new Promise((resolve, reject) => {
    const proc = spawn('sf', args, {
      timeout: 300_000, // 5 minutes for user to complete login
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString() })

    proc.on('error', (err) => {
      reject(new Error(`Login process error: ${err.message}`))
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, alias })
      } else {
        reject(new Error(stderr || stdout || `sf org login web exited with code ${code}`))
      }
    })
  })
}

/**
 * Headless variant of orgLoginWeb for Docker/CI environments.
 *
 * In Docker, `sf org login web` cannot open a browser, but it still starts its
 * callback server on port 1717 and prints the login URL to stdout. We capture
 * that URL and return it so the frontend can open it as a popup on the host.
 *
 * Returns:
 *   - urlPromise: resolves with the captured login URL (10s timeout)
 *   - completionPromise: resolves when the user completes auth and sf exits
 *   - process: the spawned child process (for cleanup in tests)
 */
export function orgLoginWebHeadless(alias, instanceUrl) {
  const args = ['org', 'login', 'web', '--alias', alias]
  if (instanceUrl) args.push('--instance-url', instanceUrl)

  const proc = spawn('sf', args, {
    timeout: 300_000,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stdout = ''
  let stderr = ''

  let urlResolved = false

  const urlPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timed out waiting for login URL from sf CLI stdout'))
    }, 10_000)

    function checkForUrl() {
      if (urlResolved) return
      const combined = stdout + '\n' + stderr
      const match = combined.match(/https?:\/\/[^\s"'<>]*\/services\/oauth2\/authorize[^\s"'<>]*/)
      if (match) {
        urlResolved = true
        clearTimeout(timer)
        resolve(match[0])
      }
    }

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
      checkForUrl()
    })
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
      checkForUrl()
    })
    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(new Error(`Login process error: ${err.message}`))
    })
    proc.once('close', (code) => {
      if (urlResolved) return
      clearTimeout(timer)
      reject(new Error(stderr || stdout || `sf org login web exited with code ${code} before emitting login URL`))
    })
  })

  const completionPromise = new Promise((resolve, reject) => {
    proc.once('close', (code) => {
      if (code === 0) {
        resolve({ success: true, alias })
      } else if (code === null) {
        reject(new Error('sf org login web was killed or timed out before completing'))
      } else {
        reject(new Error(stderr || stdout || `sf org login web exited with code ${code}`))
      }
    })
    proc.on('error', (err) => {
      reject(new Error(`Login process error: ${err.message}`))
    })
  })

  // Prevent unhandled rejection warnings when urlPromise rejects but completionPromise
  // is never awaited (e.g., URL timed out, caller bailed)
  urlPromise.catch(() => {})
  completionPromise.catch(() => {})

  return { urlPromise, completionPromise, process: proc }
}

/**
 * Authenticate an org using an SFDX auth URL (for headless/Docker environments).
 * The auth URL format: force://<clientId>:<clientSecret>:<refreshToken>@<instanceUrl>
 */
export async function orgLoginSfdxUrl(alias, authUrl) {
  // Write auth URL to a temp file (sf CLI reads it from a file)
  const tmpFile = path.join(os.tmpdir(), `pushly-auth-${Date.now()}.txt`)
  fs.writeFileSync(tmpFile, authUrl.trim(), 'utf-8')

  try {
    const result = await sfCommand([
      'org', 'login', 'sfdx-url',
      '--sfdx-url-file', tmpFile,
      '--alias', alias,
    ])
    return { success: true, alias, ...result }
  } finally {
    // Always clean up the temp file
    try { fs.unlinkSync(tmpFile) } catch {}
  }
}

/**
 * Detect if we're running in a headless environment (Docker, CI, etc.)
 */
let _headlessCache = null
export function isHeadless() {
  if (_headlessCache !== null) return _headlessCache
  if (process.env.PUSHLY_HEADLESS === '1' || process.env.PUSHLY_HEADLESS === 'true') {
    _headlessCache = true
    return true
  }
  try {
    _headlessCache = fs.existsSync('/.dockerenv')
  } catch {
    _headlessCache = false
  }
  return _headlessCache
}

export async function listMetadataTypes(orgAlias) {
  return sfCommand(['org', 'list', 'metadata-types', '--target-org', orgAlias])
}

export async function listMetadata(orgAlias, metadataType) {
  return sfCommand(['org', 'list', 'metadata', '--metadata-type', metadataType, '--target-org', orgAlias])
}

export async function retrieveMetadata(orgAlias, components, workspacePath) {
  const args = ['project', 'retrieve', 'start', '--target-org', orgAlias]
  if (Array.isArray(components) && components.length > 0) {
    // Components come as { type, fullName } objects — format as Type:Name for SF CLI
    // Each component needs its own --metadata flag (repeatable flag, not comma-separated)
    for (const c of components) {
      const name = typeof c === 'string' ? c : `${c.type}:${c.fullName}`
      args.push('--metadata', name)
    }
  }
  return sfCommand(args, { cwd: workspacePath })
}

export async function deployMetadata(targetOrg, workspacePath, options = {}) {
  const args = ['project', 'deploy', 'start', '--target-org', targetOrg]
  if (options.testLevel) args.push('--test-level', options.testLevel)
  if (options.dryRun) args.push('--dry-run')
  return sfCommand(args, { cwd: workspacePath })
}

export async function validateDeploy(targetOrg, workspacePath) {
  return deployMetadata(targetOrg, workspacePath, { dryRun: true })
}
