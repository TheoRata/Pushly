import { describe, it, expect } from 'vitest'
import { diffInventories } from '../services/compare.js'

function makeComponent(type, fullName, lastModifiedDate = '2026-01-01T00:00:00Z') {
  return { type, fullName, lastModifiedDate }
}

describe('diffInventories', () => {
  it('identifies new components (in source, not in target)', () => {
    const source = [makeComponent('Flow', 'Lead_Assignment')]
    const target = []
    const result = diffInventories(source, target)
    expect(result.new).toHaveLength(1)
    expect(result.new[0].fullName).toBe('Lead_Assignment')
    expect(result.new[0].type).toBe('Flow')
  })

  it('identifies deleted components (in target, not in source)', () => {
    const source = []
    const target = [makeComponent('CustomField', 'Account.Legacy__c')]
    const result = diffInventories(source, target)
    expect(result.deleted).toHaveLength(1)
    expect(result.deleted[0].fullName).toBe('Account.Legacy__c')
  })

  it('identifies modified components (same key, different lastModifiedDate)', () => {
    const source = [makeComponent('Flow', 'Lead_Assignment', '2026-03-01T00:00:00Z')]
    const target = [makeComponent('Flow', 'Lead_Assignment', '2026-01-01T00:00:00Z')]
    const result = diffInventories(source, target)
    expect(result.modified).toHaveLength(1)
    expect(result.modified[0].fullName).toBe('Lead_Assignment')
  })

  it('identifies unchanged components (same key, same lastModifiedDate)', () => {
    const source = [makeComponent('ApexClass', 'MyClass', '2026-01-01T00:00:00Z')]
    const target = [makeComponent('ApexClass', 'MyClass', '2026-01-01T00:00:00Z')]
    const result = diffInventories(source, target)
    expect(result.unchanged).toHaveLength(1)
  })

  it('handles empty inputs', () => {
    const result = diffInventories([], [])
    expect(result.new).toHaveLength(0)
    expect(result.deleted).toHaveLength(0)
    expect(result.modified).toHaveLength(0)
    expect(result.unchanged).toHaveLength(0)
  })

  it('handles mixed results correctly', () => {
    const source = [
      makeComponent('Flow', 'New_Flow', '2026-03-01T00:00:00Z'),
      makeComponent('ApexClass', 'Shared', '2026-03-01T00:00:00Z'),
      makeComponent('CustomField', 'Account.Name', '2026-01-01T00:00:00Z'),
    ]
    const target = [
      makeComponent('ApexClass', 'Shared', '2026-01-01T00:00:00Z'),
      makeComponent('CustomField', 'Account.Name', '2026-01-01T00:00:00Z'),
      makeComponent('Layout', 'Old_Layout', '2026-01-01T00:00:00Z'),
    ]
    const result = diffInventories(source, target)
    expect(result.new).toHaveLength(1)
    expect(result.new[0].fullName).toBe('New_Flow')
    expect(result.modified).toHaveLength(1)
    expect(result.modified[0].fullName).toBe('Shared')
    expect(result.unchanged).toHaveLength(1)
    expect(result.unchanged[0].fullName).toBe('Account.Name')
    expect(result.deleted).toHaveLength(1)
    expect(result.deleted[0].fullName).toBe('Old_Layout')
  })
})
