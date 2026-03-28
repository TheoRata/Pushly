import { describe, it, expect, beforeEach } from 'vitest'
import {
  createOperation,
  completeOperation,
  getOperation,
  getActiveOperations,
  cleanupCompletedOperations,
  _resetForTest,
} from '../services/operations.js'

describe('operations', () => {
  beforeEach(() => {
    _resetForTest()
  })

  it('creates and retrieves an operation', () => {
    createOperation('op-1', 'deploy', { components: ['Flow:Test'] })
    const op = getOperation('op-1')
    expect(op).not.toBeNull()
    expect(op.status).toBe('running')
    expect(op.type).toBe('deploy')
  })

  it('completes an operation', () => {
    createOperation('op-2', 'retrieve', {})
    completeOperation('op-2', { success: true })
    const op = getOperation('op-2')
    expect(op.status).toBe('completed')
    expect(op.completedAt).toBeDefined()
  })

  it('marks failed operations', () => {
    createOperation('op-3', 'deploy', {})
    completeOperation('op-3', { error: 'something broke' })
    const op = getOperation('op-3')
    expect(op.status).toBe('failed')
  })

  it('lists only active operations', () => {
    createOperation('op-a', 'deploy', {})
    createOperation('op-b', 'retrieve', {})
    completeOperation('op-b', { success: true })
    const active = getActiveOperations()
    expect(active).toHaveLength(1)
    expect(active[0].id).toBe('op-a')
  })
})

describe('cleanupCompletedOperations', () => {
  beforeEach(() => {
    _resetForTest()
  })

  it('removes completed operations older than maxAge', () => {
    createOperation('old-op', 'deploy', {})
    completeOperation('old-op', { success: true })
    const op = getOperation('old-op')
    op.completedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const removed = cleanupCompletedOperations(60 * 60 * 1000)
    expect(removed).toBe(1)
    expect(getOperation('old-op')).toBeNull()
  })

  it('keeps recent completed operations', () => {
    createOperation('new-op', 'deploy', {})
    completeOperation('new-op', { success: true })
    const removed = cleanupCompletedOperations(60 * 60 * 1000)
    expect(removed).toBe(0)
    expect(getOperation('new-op')).not.toBeNull()
  })

  it('keeps running operations', () => {
    createOperation('running-op', 'deploy', {})
    const removed = cleanupCompletedOperations(0)
    expect(removed).toBe(0)
    expect(getOperation('running-op')).not.toBeNull()
  })
})
