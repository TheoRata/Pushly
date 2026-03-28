import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { acquireLock, releaseLock, checkLock, cleanupStaleLocks } from '../services/lock.js'

describe('lock service', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pushly-lock-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('acquires a lock when none exists', () => {
    const result = acquireLock('myOrg', 'alice', ['Flow:MyFlow'], tmpDir)
    expect(result.acquired).toBe(true)
  })

  it('rejects a second lock on the same org', () => {
    acquireLock('myOrg', 'alice', ['Flow:MyFlow'], tmpDir)
    const result = acquireLock('myOrg', 'bob', ['Flow:Other'], tmpDir)
    expect(result.acquired).toBe(false)
    expect(result.existingLock.user).toBe('alice')
  })

  it('releases a lock', () => {
    acquireLock('myOrg', 'alice', ['Flow:MyFlow'], tmpDir)
    releaseLock('myOrg', tmpDir)
    const check = checkLock('myOrg', tmpDir)
    expect(check).toBeNull()
  })

  it('re-acquires after release', () => {
    acquireLock('myOrg', 'alice', ['Flow:MyFlow'], tmpDir)
    releaseLock('myOrg', tmpDir)
    const result = acquireLock('myOrg', 'bob', ['Flow:Other'], tmpDir)
    expect(result.acquired).toBe(true)
  })

  it('cleans up stale locks', () => {
    const lockPath = path.join(tmpDir, 'oldOrg.deploy.lock')
    const staleData = {
      user: 'alice',
      orgAlias: 'oldOrg',
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      components: [],
      pid: 99999,
    }
    fs.writeFileSync(lockPath, JSON.stringify(staleData, null, 2))
    const cleaned = cleanupStaleLocks(tmpDir)
    expect(cleaned).toBe(1)
    expect(fs.existsSync(lockPath)).toBe(false)
  })

  it('checkLock returns null for stale lock and removes file', () => {
    const lockPath = path.join(tmpDir, 'staleOrg.deploy.lock')
    const staleData = {
      user: 'alice',
      orgAlias: 'staleOrg',
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      components: [],
      pid: 99999,
    }
    fs.writeFileSync(lockPath, JSON.stringify(staleData, null, 2))
    const result = checkLock('staleOrg', tmpDir)
    expect(result).toBeNull()
    expect(fs.existsSync(lockPath)).toBe(false)
  })

  it('checkLock returns data for fresh lock', () => {
    acquireLock('freshOrg', 'alice', ['Flow:Test'], tmpDir)
    const result = checkLock('freshOrg', tmpDir)
    expect(result).not.toBeNull()
    expect(result.user).toBe('alice')
  })
})
