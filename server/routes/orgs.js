import { Router } from 'express'
import { listOrgs, orgDisplay, orgLoginWeb, orgLoginWebHeadless, killActiveLoginProcesses, orgLoginSfdxUrl, isHeadless, sfCommand } from '../services/sf-cli.js'

const router = Router()

// Track pending login flows so health polling can detect completion/failure
const pendingLogins = new Map()

/**
 * GET /api/orgs — list all authenticated orgs, enriched with health status
 */
router.get('/', async (_req, res) => {
  try {
    const result = await listOrgs()
    // sf org list returns { other, nonScratchOrgs, scratchOrgs, sandboxes }
    // Tag each org with its source array, then merge and deduplicate
    const tagged = [
      ...(result.other || []).map((o) => ({ ...o, _source: 'other' })),
      ...(result.nonScratchOrgs || []).map((o) => ({ ...o, _source: 'nonScratchOrgs' })),
      ...(result.scratchOrgs || []).map((o) => ({ ...o, _source: 'scratchOrgs' })),
      ...(result.sandboxes || []).map((o) => ({ ...o, _source: 'sandboxes' })),
    ]
    const seen = new Set()
    const orgs = tagged.filter((org) => {
      const key = org.orgId || org.username
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Determine org type from multiple signals:
    // 1. If from sandboxes array → sandbox
    // 2. If isSandbox === true → sandbox
    // 3. If from scratchOrgs array → scratch
    // 4. If instanceUrl contains '.sandbox.' or '--' (sandbox pattern) → sandbox
    // 5. If instanceUrl contains 'trailblaze' or 'dev-ed' → developer edition
    // 6. Otherwise → production
    function resolveOrgType(org) {
      if (org._source === 'sandboxes' || org.isSandbox === true) return 'sandbox'
      if (org._source === 'scratchOrgs' || org.isScratch === true) return 'scratch'
      const url = (org.instanceUrl || '').toLowerCase()
      if (url.includes('.sandbox.')) return 'sandbox'
      if (url.includes('trailblaze') || url.includes('dev-ed')) return 'developer'
      return 'production'
    }

    // Normalize fields for the frontend
    // Spread raw org first, then override with normalized fields
    const enriched = orgs.map((org) => ({
      ...org,
      alias: org.alias || org.username,
      username: org.username,
      type: resolveOrgType(org),
      status: org.connectedStatus === 'Connected' ? 'connected' : 'expired',
      lastUsed: org.lastUsed,
      orgId: org.orgId,
      instanceUrl: org.instanceUrl,
      name: org.name,
    }))

    res.json({ orgs: enriched })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list orgs', details: err })
  }
})

/**
 * GET /api/orgs/env — returns environment info (headless detection for Docker)
 */
router.get('/env', (_req, res) => {
  res.json({ headless: isHeadless() })
})

/**
 * POST /api/orgs/connect/auth-url — authenticate using an SFDX auth URL (headless/Docker)
 * Body: { alias, authUrl }
 */
router.post('/connect/auth-url', async (req, res) => {
  const { alias, authUrl } = req.body

  if (!alias || !authUrl) {
    return res.status(400).json({ error: 'alias and authUrl are required' })
  }

  // Basic validation: auth URL should start with force://
  if (!authUrl.trim().startsWith('force://')) {
    return res.status(400).json({ error: 'Invalid auth URL. It should start with force://' })
  }

  try {
    await orgLoginSfdxUrl(alias, authUrl)
    res.json({ status: 'connected', alias })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to authenticate with auth URL' })
  }
})

/**
 * POST /api/orgs/connect — initiate org login via browser OAuth
 * Body: { alias, type } where type is 'production' | 'sandbox'
 */
router.post('/connect', async (req, res) => {
  const { alias, type, customDomain } = req.body

  if (!alias || !type) {
    return res.status(400).json({ error: 'alias and type are required' })
  }

  // Custom domain takes priority, then fall back to standard login URLs
  let instanceUrl
  if (customDomain && customDomain.trim()) {
    let domain = customDomain.trim()
    if (!domain.startsWith('http')) domain = `https://${domain}`
    instanceUrl = domain.replace(/\/+$/, '')
  } else {
    instanceUrl = type === 'sandbox'
      ? 'https://test.salesforce.com'
      : 'https://login.salesforce.com'
  }

  try {
    pendingLogins.set(alias, { status: 'authenticating', startedAt: Date.now() })

    if (isHeadless()) {
      // Kill any previous sf login process that's still waiting for a callback —
      // otherwise our new process will fail with EADDRINUSE on port 1717.
      killActiveLoginProcesses()

      // Docker/CI: capture the login URL from sf CLI stdout and send it to the
      // frontend so it can open a popup in the user's host browser.
      const { urlPromise, completionPromise, process: loginProc } = orgLoginWebHeadless(alias, instanceUrl)

      // Wire completion to pendingLogins (fire-and-forget)
      completionPromise
        .then(() => {
          pendingLogins.set(alias, { status: 'connected' })
          setTimeout(() => pendingLogins.delete(alias), 30000)
        })
        .catch((err) => {
          console.error(`Headless login error for ${alias}:`, err.message || err)
          pendingLogins.set(alias, { status: 'error', error: err.message || 'Login failed' })
          setTimeout(() => pendingLogins.delete(alias), 60000)
        })

      // Await URL capture (fast — typically <1s).
      // If it times out or errors, kill the spawned sf process before re-throwing
      // so it doesn't run orphaned for up to 5 minutes.
      try {
        const loginUrl = await urlPromise
        return res.json({ status: 'authenticating', alias, loginUrl })
      } catch (urlErr) {
        try { loginProc.kill() } catch {}
        throw urlErr
      }
    }

    // Non-headless: existing flow — sf CLI opens a browser locally
    orgLoginWeb(alias, instanceUrl)
      .then(() => {
        pendingLogins.set(alias, { status: 'connected' })
        setTimeout(() => pendingLogins.delete(alias), 30000)
      })
      .catch((err) => {
        console.error(`OAuth flow error for ${alias}:`, err.message || err)
        pendingLogins.set(alias, { status: 'error', error: err.message || 'Login failed' })
        setTimeout(() => pendingLogins.delete(alias), 60000)
      })

    res.json({ status: 'authenticating', alias })
  } catch (err) {
    pendingLogins.set(alias, { status: 'error', error: err.message || 'Login failed' })
    setTimeout(() => pendingLogins.delete(alias), 60000)
    res.status(500).json({ error: err.message || 'Failed to start org connection' })
  }
})

/**
 * POST /api/orgs/:alias/refresh — re-authenticate an org (same OAuth flow)
 */
router.post('/:alias/refresh', async (req, res) => {
  const { alias } = req.params

  try {
    pendingLogins.set(alias, { status: 'authenticating', startedAt: Date.now() })

    orgLoginWeb(alias)
      .then(() => {
        pendingLogins.set(alias, { status: 'connected' })
        setTimeout(() => pendingLogins.delete(alias), 30000)
      })
      .catch((err) => {
        console.error(`OAuth refresh error for ${alias}:`, err.message || err)
        pendingLogins.set(alias, { status: 'error', error: err.message || 'Refresh failed' })
        setTimeout(() => pendingLogins.delete(alias), 60000)
      })

    res.json({ status: 'authenticating', alias })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to refresh org' })
  }
})

/**
 * DELETE /api/orgs/:alias — log out of an org
 */
router.delete('/:alias', async (req, res) => {
  const { alias } = req.params

  try {
    await sfCommand(['org', 'logout', '--target-org', alias, '--no-prompt'])
    res.json({ status: 'disconnected', alias })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to disconnect org', details: err })
  }
})

/**
 * GET /api/orgs/:alias/health — check org connection status
 */
router.get('/:alias/health', async (req, res) => {
  const { alias } = req.params

  // Check if there's a pending login that errored
  const pending = pendingLogins.get(alias)
  if (pending && pending.status === 'error') {
    pendingLogins.delete(alias)
    return res.json({ alias, status: 'error', error: pending.error })
  }

  try {
    const info = await orgDisplay(alias)
    // Login succeeded — clean up pending state
    if (pending) pendingLogins.delete(alias)
    res.json({
      alias,
      status: 'connected',
      info,
    })
  } catch (err) {
    // If login is still in progress, report authenticating
    if (pending && pending.status === 'authenticating') {
      return res.json({ alias, status: 'authenticating' })
    }
    res.json({
      alias,
      status: 'disconnected',
      error: err.message || 'Org not reachable',
    })
  }
})

/**
 * GET /api/orgs/login-success — branded success page shown in the login popup
 * after auth completes. Auto-closes after a countdown. Served from our origin
 * (port 3000) so window.close() works.
 */
router.get('/login-success', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pushly — Connected</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: #171717; color: #e5e5e5;
    }
    .card {
      text-align: center; padding: 3rem 2rem; max-width: 420px;
      background: rgba(255,255,255,0.03); border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .check {
      display: inline-flex; align-items: center; justify-content: center;
      width: 64px; height: 64px; border-radius: 50%;
      background: #22c55e; color: white;
      font-size: 2rem; font-weight: bold;
      margin-bottom: 1.5rem;
    }
    h1 {
      margin: 0 0 0.75rem;
      font-size: 1.5rem; font-weight: 600;
      color: #fafafa;
    }
    p {
      margin: 0; color: #a3a3a3;
      font-size: 0.95rem;
    }
    .countdown { font-weight: 600; color: #e5e5e5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&check;</div>
    <h1>Connection successful</h1>
    <p>This window will close automatically in <span class="countdown" id="count">5</span> seconds.</p>
  </div>
  <script>
    let remaining = 5;
    const el = document.getElementById('count');
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        window.close();
      } else {
        el.textContent = String(remaining);
      }
    }, 1000);
  </script>
</body>
</html>`)
})

export default router
