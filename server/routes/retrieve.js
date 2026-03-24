import { Router } from 'express'
import crypto from 'node:crypto'
import { retrieveMetadata } from '../services/sf-cli.js'
import { createWorkspace } from '../services/workspace.js'
import { writeRecord, readRecords, readRecord } from '../services/history.js'
import { resolveUser } from '../services/user.js'

const router = Router()

// In-memory operation tracker
const operations = new Map()

/**
 * GET /api/retrieve — list recent retrieve operations
 */
router.get('/', (req, res) => {
  const dataDir = req.app.locals.dataDir
  const user = resolveUser(dataDir)

  const records = readRecords({ user }, dataDir)
  const retrieveRecords = records.filter((r) => r.type === 'retrieve')

  res.json({ operations: retrieveRecords })
})

/**
 * POST /api/retrieve — start a retrieve operation
 * Body: { orgAlias, components, mode }
 */
router.post('/', async (req, res) => {
  const { orgAlias, components, mode } = req.body
  const dataDir = req.app.locals.dataDir
  const baseDir = req.app.locals.baseDir

  if (!orgAlias || !components || !Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ error: 'orgAlias and components array are required' })
  }

  const user = resolveUser(dataDir)
  const operationId = crypto.randomUUID()

  try {
    // Create workspace
    const workspace = createWorkspace(user, orgAlias, baseDir)

    // Write initial history record
    const record = {
      id: operationId,
      type: 'retrieve',
      user,
      sourceOrg: orgAlias,
      components,
      mode: mode || 'metadata',
      workspaceId: workspace.id,
      workspacePath: workspace.path,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    }
    writeRecord(record, dataDir)

    // Track the operation
    operations.set(operationId, { status: 'in_progress' })

    // Return immediately, run retrieve in background
    res.json({ operationId, workspaceId: workspace.id })

    // Execute retrieve asynchronously
    try {
      const result = await retrieveMetadata(orgAlias, components, workspace.path)
      record.status = 'success'
      record.completedAt = new Date().toISOString()
      record.result = result
      writeRecord(record, dataDir)
      operations.set(operationId, { status: 'success', result })
    } catch (err) {
      record.status = 'failed'
      record.completedAt = new Date().toISOString()
      record.error = err.message || String(err)
      writeRecord(record, dataDir)
      operations.set(operationId, { status: 'failed', error: record.error })
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to start retrieve' })
  }
})

/**
 * GET /api/retrieve/:id/status — get operation status
 */
router.get('/:id/status', (req, res) => {
  const { id } = req.params
  const dataDir = req.app.locals.dataDir

  // Check in-memory first for latest state
  const op = operations.get(id)
  if (op) {
    return res.json({ operationId: id, ...op })
  }

  // Fall back to history record
  const record = readRecord(id, dataDir)
  if (!record) {
    return res.status(404).json({ error: 'Operation not found' })
  }

  res.json({ operationId: id, status: record.status, record })
})

export default router
