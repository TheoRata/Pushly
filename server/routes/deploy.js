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
    // sfCommand rejects with { code, plain, action, raw, stderr, result }
    const errorMsg = err.plain || err.message || err.raw || 'Validation failed'
    const action = err.action || ''
    const parsedResult = err.result || {}
    // err.result is the full parsed JSON; component failures are at result.details.componentFailures
    const innerResult = parsedResult.result || parsedResult
    const innerDetails = innerResult.details || {}

    // Extract component-level failures from the SF CLI result
    const componentFailures = innerDetails.componentFailures || []
    const failureList = (Array.isArray(componentFailures) ? componentFailures : [componentFailures])
      .filter(Boolean)
      .map((f) => ({
        type: f.componentType || '',
        name: f.fullName || '',
        problem: f.problem || '',
        line: f.lineNumber || null,
      }))

    res.status(422).json({
      status: 'validation_failed',
      error: errorMsg,
      action,
      failures: failureList,
      details: innerResult,
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

    // Extract component details from SF CLI result
    const details = result?.details || {}
    const successes = Array.isArray(details.componentSuccesses) ? details.componentSuccesses : []
    const failures = Array.isArray(details.componentFailures) ? details.componentFailures : []
    const componentList = [
      ...successes.filter((c) => c.fullName !== 'package.xml').map((c) => ({
        name: c.fullName,
        type: c.componentType || '',
        status: 'succeeded',
      })),
      ...failures.map((c) => ({
        name: c.fullName,
        type: c.componentType || '',
        status: 'failed',
        problem: c.problem || '',
      })),
    ]

    record.status = 'success'
    record.completedAt = new Date().toISOString()
    record.result = result
    writeRecord(record, dataDir)
    completeOperation(operationId, {
      components: components || [],
      result,
      componentList,
      message: `Deployed ${successes.length} components to ${targetOrg}`,
    })
  } catch (err) {
    // sfCommand rejects with { code, plain, action, raw, stderr, result }
    const errorMsg = err.plain || err.message || err.raw || 'Deploy failed'
    const action = err.action || ''

    // Extract component-level failures
    const cfRaw = err.result?.details?.componentFailures || []
    const componentFailures = (Array.isArray(cfRaw) ? cfRaw : [cfRaw]).filter(Boolean)
    const componentList = componentFailures.map((c) => ({
      name: c.fullName || '',
      type: c.componentType || '',
      status: 'failed',
      problem: c.problem || '',
    }))

    record.status = 'failed'
    record.completedAt = new Date().toISOString()
    record.error = errorMsg
    record.failedComponents = componentFailures
    writeRecord(record, dataDir)
    completeOperation(operationId, {
      error: errorMsg,
      action,
      componentList,
      failedComponents: componentFailures,
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
    record.error = err.plain || err.message || err.raw || 'Operation failed'
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

  // Check if the snapshot has an actual SFDX project to deploy
  const fs = await import('node:fs')
  const path = await import('node:path')
  const sfdxProject = path.join(snapshotPath, 'sfdx-project.json')
  const forceApp = path.join(snapshotPath, 'force-app')
  if (!fs.existsSync(sfdxProject) || !fs.existsSync(forceApp)) {
    return res.status(422).json({
      error: 'Rollback is not available for this deployment. The pre-deploy snapshot does not contain source files. To undo this deploy, retrieve the previous version of the components from the source org and deploy them again.',
    })
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
    record.error = err.plain || err.message || err.raw || 'Operation failed'
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
