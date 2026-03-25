import { Router } from 'express'
import crypto from 'node:crypto'
import { retrieveMetadata } from '../services/sf-cli.js'
import { createWorkspace } from '../services/workspace.js'
import { writeRecord, readRecords, readRecord } from '../services/history.js'
import { resolveUser } from '../services/user.js'
import {
  createOperation,
  updateOperation,
  completeOperation,
  getOperation,
} from '../services/operations.js'

const router = Router()

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
  const { orgAlias, components, mode, name } = req.body
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
      name: name || '',
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

    // Track the operation via operations manager
    createOperation(operationId, 'retrieve', { orgAlias, components })

    // Return immediately, run retrieve in background
    res.json({ operationId, workspaceId: workspace.id })

    // Execute retrieve asynchronously
    try {
      updateOperation(operationId, {
        status: 'running',
        message: `Starting retrieve from ${orgAlias}`,
      })

      // Send progress for each component being retrieved
      for (const comp of components) {
        const name = typeof comp === 'string' ? comp : `${comp.type}:${comp.fullName}`
        updateOperation(operationId, {
          message: `Retrieving ${name}...`,
          component: name,
        })
      }

      const result = await retrieveMetadata(orgAlias, components, workspace.path)

      // Build component list from the result for the frontend
      const fileProps = result?.fileProperties || []
      const componentList = fileProps
        .filter((f) => f.fullName !== 'unpackaged/package.xml' && f.type !== 'Package')
        .map((f) => ({
          name: f.fullName,
          type: f.type || '',
          status: 'succeeded',
        }))

      record.status = 'success'
      record.completedAt = new Date().toISOString()
      record.result = result
      writeRecord(record, dataDir)
      completeOperation(operationId, {
        components,
        result,
        componentList,
        message: `Retrieved ${componentList.length} components from ${orgAlias}`,
      })
    } catch (err) {
      record.status = 'failed'
      record.completedAt = new Date().toISOString()
      record.error = err.message || String(err)
      writeRecord(record, dataDir)
      completeOperation(operationId, { error: record.error, components })
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

  // Check operations manager first for latest state
  const op = getOperation(id)
  if (op) {
    return res.json({ operationId: id, status: op.status, log: op.log, result: op.result })
  }

  // Fall back to history record
  const record = readRecord(id, dataDir)
  if (!record) {
    return res.status(404).json({ error: 'Operation not found' })
  }

  res.json({ operationId: id, status: record.status, record })
})

export default router
