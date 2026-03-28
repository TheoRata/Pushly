import { describe, it, expect } from 'vitest'
import { safeName } from '../utils/sanitize.js'

describe('safeName', () => {
  it('allows alphanumeric, dots, hyphens, underscores', () => {
    expect(safeName('my-org_alias.prod')).toBe('my-org_alias.prod')
  })

  it('replaces path traversal characters', () => {
    expect(safeName('../../etc/passwd')).toBe('.._.._etc_passwd')
  })

  it('replaces slashes', () => {
    expect(safeName('foo/bar\\baz')).toBe('foo_bar_baz')
  })

  it('replaces spaces and special chars', () => {
    expect(safeName('my org (prod)')).toBe('my_org__prod_')
  })

  it('handles empty string', () => {
    expect(safeName('')).toBe('')
  })

  it('handles normal org aliases', () => {
    expect(safeName('DevHub')).toBe('DevHub')
    expect(safeName('prod-org')).toBe('prod-org')
    expect(safeName('sandbox.dev')).toBe('sandbox.dev')
  })
})
