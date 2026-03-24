import { Router } from 'express'
import crypto from 'node:crypto'
import { deployMetadata, validateDeploy } from '../services/sf-cli.js'
import { acquireLock, releaseLock } from '../services/lock.js'
import { createSnapshot, getRollbackPath } from '../services/rollback.js'
import { writeRecord, readRecord } from '../services/history.js'
import { getWorkspace } from '../services/workspace.js'
import { resolveUser } from '../services/user.js'
import {
  createOperation,
  updateOperation,
  completeOperation,
  getOperation,
} from '../services/operations.js'

const router = Router()

/**
 * POST /api/deploy/validate — dry-run deploy
 * Body: { targetOrg, workspacePath }
 */
router.post('/validate', async (req, res) => {
  const { targetOrg, workspacePath } = req.body
  const baseDir = req.app.locals.baseDir

  if (!targetOrg || !workspacePath) {
    return res.status(400).json({ error: 'targetOrg and workspacePath are required' })
  }

  // Resolve workspace path if it's an ID
  const resolvedPath = getWorkspace(workspacePath, baseDir) || workspacePath

  try {
    const result = await validateDeploy(targetOrg, resolvedPath)
    res.json({ status: 'success', result })
  } catch (err) {
    res.status(422).json({
      status: 'validation_failed',
      error: err.message || 'Validation failed',
      details: err.result || err,
    })
  }
})

/**
 * POST /api/deploy — execute deployment
 * Body: { targetOrg, workspacePath, components }
 */
router.post('/', async (req, res) => {
  const { targetOrg, workspacePath, components } = req.body
  const dataDir = req.app.locals.dataDir
  const baseDir = req.app.locals.baseDir

  if (!targetOrg || !workspacePath) {
    return res.status(400).json({ error: 'targetOrg and workspacePath are required' })
  }

  const user = resolveUser(dataDir)
  const operationId = crypto.randomUUID()
  const resolvedPath = getWorkspace(workspacePath, baseDir) || workspacePath

  // Acquire lock
  const lockResult = acquireLock(targetOrg, user, components || [], dataDir)
  if (!lockResult.acquired) {
    return res.status(409).json({
      error: 'Deployment already in progress for this org',
      existingLock: lockResult.existingLock,
    })
  }

  // Create rollback snapshot
  const snapshotDir = createSnapshot(operationId, components || [], dataDir)

  // Write initial history record
  const record = {
    id: operationId,
    type: 'deploy',
    user,
    targetOrg,
    components: components || [],
    workspacePath: resolvedPath,
    snapshotDir,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  }
  writeRecord(record, dataDir)
  createOperation(operationId, 'deploy', { targetOrg, components: components || [] })

  // Return immediately
  res.json({ operationId })

  // Execute deploy asynchronously
  try {
    updateOperation(operationId, {
      status: 'running',
      message: `Starting deploy to ${targetOrg}`,
    })

    const result = await deployMetadata(targetOrg, resolvedPath)
    record.status = 'success'
    record.completedAt = new Date().toISOString()
    record.result = result
    writeRecord(record, dataDir)
    completeOperation(operationId, { components: components || [], result })
  } catch (err) {
    record.status = 'failed'
    record.completedAt = new Date().toISOString()
    record.error = err.message || String(err)
    record.failedComponents = err.result?.details?.componentFailures || []
    writeRecord(record, dataDir)
    completeOperation(operationId, {
      error: record.error,
      failedComponents: record.failedComponents,
    })
  } finally {
    releaseLock(targetOrg, dataDir)
  }
})

/**
 * POST /api/deploy/:id/retry-failed — re-deploy only failed components
 */
router.post('/:id/retry-failed', async (req, res) => {
  const { id } = req.params
  const dataDir = req.app.locals.dataDir
  const baseDir = req.app.locals.baseDir

  const original = readRecord(id, dataDir)
  if (!original) {
    return res.status(404).json({ error: 'Operation not found' })
  }
  if (original.status !== 'failed') {
    return res.status(400).json({ error: 'Can only retry failed deployments' })
  }

  const failedComponents = original.failedComponents || []
  if (failedComponents.length === 0) {
    return res.status(400).json({ error: 'No failed components to retry' })
  }

  const user = resolveUser(dataDir)
  const retryId = crypto.randomUUID()
  const resolvedPath = getWorkspace(original.workspacePath, baseDir) || original.workspacePath

  // Acquire lock
  const lockResult = acquireLock(original.targetOrg, user, failedComponents, dataDir)
  if (!lockResult.acquired) {
    return res.status(409).json({
      error: 'Deployment already in progress for this org',
      existingLock: lockResult.existingLock,
    })
  }

  const record = {
    id: retryId,
    type: 'deploy',
    user,
    targetOrg: original.targetOrg,
    components: failedComponents,
    workspacePath: resolvedPath,
    retryOf: id,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  }
  writeRecord(record, dataDir)
  createOperation(retryId, 'deploy', {
    targetOrg: original.targetOrg,
    components: failedComponents,
    retryOf: id,
  })

  res.json({ operationId: retryId })

  try {
    updateOperation(retryId, {
      status: 'running',
      message: `Retrying failed components on ${original.targetOrg}`,
    })

    const result = await deployMetadata(original.targetOrg, resolvedPath)
    record.status = 'success'
    record.completedAt = new Date().toISOString()
    record.result = result
    writeRecord(record, dataDir)
    completeOperation(retryId, { components: failedComponents, result })
  } catch (err) {
    record.status = 'failed'
    record.completedAt = new Date().toISOString()
    record.error = err.message || String(err)
    writeRecord(record, dataDir)
    completeOperation(retryId, { error: record.error })
  } finally {
    releaseLock(original.targetOrg, dataDir)
  }
})

/**
 * POST /api/deploy/:id/rollback — deploy the rollback snapshot back
 */
router.post('/:id/rollback', async (req, res) => {
  const { id } = req.params
  const dataDir = req.app.locals.dataDir

  const original = readRecord(id, dataDir)
  if (!original) {
    return res.status(404).json({ error: 'Operation not found' })
  }

  const snapshotPath = getRollbackPath(id, dataDir)
  if (!snapshotPath) {
    return res.status(404).json({ error: 'No rollback snapshot found for this deployment' })
  }

  const user = resolveUser(dataDir)
  const rollbackId = crypto.randomUUID()

  // Acquire lock
  const lockResult = acquireLock(original.targetOrg, user, original.components || [], dataDir)
  if (!lockResult.acquired) {
    return res.status(409).json({
      error: 'Deployment already in progress for this org',
      existingLock: lockResult.existingLock,
    })
  }

  const record = {
    id: rollbackId,
    type: 'rollback',
    user,
    targetOrg: original.targetOrg,
    components: original.components || [],
    snapshotPath,
    rollbackOf: id,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  }
  writeRecord(record, dataDir)
  createOperation(rollbackId, 'rollback', {
    targetOrg: original.targetOrg,
    components: original.components || [],
    rollbackOf: id,
  })

  res.json({ operationId: rollbackId })

  try {
    updateOperation(rollbackId, {
      status: 'running',
      message: `Rolling back deployment on ${original.targetOrg}`,
    })

    const result = await deployMetadata(original.targetOrg, snapshotPath)
    record.status = 'success'
    record.completedAt = new Date().toISOString()
    record.result = result
    writeRecord(record, dataDir)
    completeOperation(rollbackId, { components: original.components || [], result })
  } catch (err) {
    record.status = 'failed'
    record.completedAt = new Date().toISOString()
    record.error = err.message || String(err)
    writeRecord(record, dataDir)
    completeOperation(rollbackId, { error: record.error })
  } finally {
    releaseLock(original.targetOrg, dataDir)
  }
})

/**
 * GET /api/deploy/:id/status — get deployment status
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
