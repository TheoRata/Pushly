import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDb, getDb, closeDb } from '../services/db.js'
import { acquireLock, releaseLock, checkLock, cleanupStaleLocks } from '../services/lock.js'

describe('lock service', () => {
  beforeEach(() => {
    initDb(':memory:')
  })

  afterEach(() => {
    closeDb()
  })

  it('acquires a lock when none exists', () => {
    const result = acquireLock('myOrg', 'alice', ['Flow:MyFlow'])
    expect(result.acquired).toBe(true)
  })

  it('rejects a second lock on the same org', () => {
    acquireLock('myOrg', 'alice', ['Flow:MyFlow'])
    const result = acquireLock('myOrg', 'bob', ['Flow:Other'])
    expect(result.acquired).toBe(false)
    expect(result.existingLock.user).toBe('alice')
  })

  it('releases a lock', () => {
    acquireLock('myOrg', 'alice', ['Flow:MyFlow'])
    releaseLock('myOrg')
    const check = checkLock('myOrg')
    expect(check).toBeNull()
  })

  it('re-acquires after release', () => {
    acquireLock('myOrg', 'alice', ['Flow:MyFlow'])
    releaseLock('myOrg')
    const result = acquireLock('myOrg', 'bob', ['Flow:Other'])
    expect(result.acquired).toBe(true)
  })

  it('cleans up stale locks', () => {
    const db = getDb()
    const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    db.prepare(`
      INSERT INTO deploy_locks (org_alias, user, components, pid, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('oldOrg', 'alice', '[]', 99999, staleTime)

    const cleaned = cleanupStaleLocks()
    expect(cleaned).toBe(1)

    const row = db.prepare('SELECT * FROM deploy_locks WHERE org_alias = ?').get('oldOrg')
    expect(row).toBeUndefined()
  })

  it('checkLock returns null for stale lock and removes it', () => {
    const db = getDb()
    const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    db.prepare(`
      INSERT INTO deploy_locks (org_alias, user, components, pid, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('staleOrg', 'alice', '[]', 99999, staleTime)

    const result = checkLock('staleOrg')
    expect(result).toBeNull()

    const row = db.prepare('SELECT * FROM deploy_locks WHERE org_alias = ?').get('staleOrg')
    expect(row).toBeUndefined()
  })

  it('checkLock returns data for fresh lock', () => {
    acquireLock('freshOrg', 'alice', ['Flow:Test'])
    const result = checkLock('freshOrg')
    expect(result).not.toBeNull()
    expect(result.user).toBe('alice')
  })
})
