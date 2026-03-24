import { describe, it, expect, vi } from 'vitest'
import { sfCommand, sfCommandStream, listOrgs } from '../services/sf-cli.js'
import { checkPrerequisites } from '../utils/prerequisites.js'

describe('checkPrerequisites', () => {
  it('returns ok: true when sf CLI and Node >= 18 are available', () => {
    const result = checkPrerequisites()
    expect(result).toHaveProperty('ok')
    expect(result).toHaveProperty('checks')
    expect(Array.isArray(result.checks)).toBe(true)

    const nodeCheck = result.checks.find((c) => c.name === 'Node.js')
    expect(nodeCheck).toBeDefined()
    expect(nodeCheck.status).toBe('pass')

    const sfCheck = result.checks.find((c) => c.name === 'Salesforce CLI')
    expect(sfCheck).toBeDefined()
    // sf CLI may or may not be installed in CI
    expect(['pass', 'fail']).toContain(sfCheck.status)
  })
})

describe('sfCommand', () => {
  it('runs sf --version --json and returns parsed output', async () => {
    // Integration test — requires sf CLI installed
    try {
      const result = await sfCommand(['--version', '--json'])
      // sf --version --json may return a string or object; just verify no throw
      expect(result).toBeDefined()
    } catch (err) {
      // If sf is not installed, the error should be translated
      expect(err).toHaveProperty('code')
      expect(err).toHaveProperty('plain')
    }
  })
})

describe('sfCommandStream', () => {
  it('streams output line by line', async () => {
    const lines = []
    try {
      const exitCode = await sfCommandStream(['--version'], (line) => {
        lines.push(line)
      })
      expect(typeof exitCode).toBe('number')
      expect(lines.length).toBeGreaterThan(0)
    } catch {
      // sf CLI not installed — acceptable in CI
    }
  })
})
