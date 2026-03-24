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
    // Merge all, deduplicate by orgId
    const allOrgs = [
      ...(result.other || []),
      ...(result.nonScratchOrgs || []),
      ...(result.scratchOrgs || []),
      ...(result.sandboxes || []),
    ]
    const seen = new Set()
    const orgs = allOrgs.filter((org) => {
      const key = org.orgId || org.username
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Normalize fields for the frontend
    const enriched = orgs.map((org) => ({
      alias: org.alias || org.username,
      username: org.username,
      type: org.isSandbox ? 'sandbox' : 'production',
      status: org.connectedStatus === 'Connected' ? 'connected' : 'expired',
      lastUsed: org.lastUsed,
      orgId: org.orgId,
      instanceUrl: org.instanceUrl,
      name: org.name,
      // Pass through original fields too
      ...org,
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
  const { alias, type } = req.body

  if (!alias || !type) {
    return res.status(400).json({ error: 'alias and type are required' })
  }

  const instanceUrl = type === 'sandbox'
    ? 'https://test.salesforce.com'
    : 'https://login.salesforce.com'

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
