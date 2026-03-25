import { Router } from 'express'
import { listOrgs, orgDisplay, orgLoginWeb } from '../services/sf-cli.js'
import { sfCommand } from '../services/sf-cli.js'

const router = Router()

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
    // Normalize: add https:// if missing, strip trailing slashes
    let domain = customDomain.trim()
    if (!domain.startsWith('http')) domain = `https://${domain}`
    instanceUrl = domain.replace(/\/+$/, '')
  } else {
    instanceUrl = type === 'sandbox'
      ? 'https://test.salesforce.com'
      : 'https://login.salesforce.com'
  }

  try {
    // Start the login flow — sf CLI opens a browser for OAuth
    orgLoginWeb(alias, instanceUrl).catch((err) => {
      console.error(`OAuth flow error for ${alias}:`, err.message || err)
    })

    // Return immediately — OAuth happens in the browser
    res.json({ status: 'authenticating', alias })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to start org connection' })
  }
})

/**
 * POST /api/orgs/:alias/refresh — re-authenticate an org (same OAuth flow)
 */
router.post('/:alias/refresh', async (req, res) => {
  const { alias } = req.params

  try {
    orgLoginWeb(alias).catch((err) => {
      console.error(`OAuth refresh error for ${alias}:`, err.message || err)
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

  try {
    const info = await orgDisplay(alias)
    res.json({
      alias,
      status: 'connected',
      info,
    })
  } catch (err) {
    res.json({
      alias,
      status: 'disconnected',
      error: err.message || 'Org not reachable',
    })
  }
})

export default router
