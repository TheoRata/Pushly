import { spawn } from 'child_process'
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
