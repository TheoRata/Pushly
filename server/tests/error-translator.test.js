import { describe, it, expect } from 'vitest'
import { translateError } from '../utils/error-translator.js'

describe('translateError', () => {
  const knownErrors = [
    {
      code: 'FIELD_INTEGRITY_EXCEPTION',
      plain: 'A required field is missing or a lookup references something that doesn\'t exist in the target org.',
      action: 'Check that all referenced objects and fields exist in the target org.',
    },
    {
      code: 'INSUFFICIENT_ACCESS',
      plain: 'Your user doesn\'t have permission to deploy this component.',
      action: 'Ask your Salesforce admin for the "Modify Metadata" permission in the target org.',
    },
    {
      code: 'DUPLICATE_VALUE',
      plain: 'This component already exists in the target org with a different configuration.',
      action: 'Check the existing component in the target org and resolve the conflict manually.',
    },
    {
      code: 'UNKNOWN_EXCEPTION',
      plain: 'Salesforce encountered an unexpected error.',
      action: 'Try again in a few minutes. If it persists, note the ErrorId and contact Salesforce support.',
    },
    {
      code: 'TEST_FAILURE',
      plain: 'Apex tests failed in the target org during deployment.',
      action: 'Fix the failing test classes or deploy with "Skip Tests" if available for sandboxes.',
    },
    {
      code: 'MISSING_REQUIRED_FIELD',
      plain: 'A required field on a record or component is not set.',
      action: 'Check that all required fields are populated in your source metadata.',
    },
    {
      code: 'INVALID_CROSS_REFERENCE_KEY',
      plain: 'A reference points to a record or component that doesn\'t exist in the target org.',
      action: 'Deploy the referenced component first, then retry.',
    },
    {
      code: 'FIELD_CUSTOM_VALIDATION_EXCEPTION',
      plain: 'A validation rule is blocking the deployment.',
      action: 'Check validation rules in the target org that may conflict.',
    },
  ]

  for (const { code, plain, action } of knownErrors) {
    it(`translates ${code}`, () => {
      const rawMessage = `Error (1:1): ${code}: Some extra detail here`
      const result = translateError(rawMessage)
      expect(result.code).toBe(code)
      expect(result.plain).toBe(plain)
      expect(result.action).toBe(action)
      expect(result.raw).toBe(rawMessage)
    })
  }

  it('returns UNKNOWN for unrecognized errors', () => {
    const rawMessage = 'Something completely unexpected happened'
    const result = translateError(rawMessage)
    expect(result.code).toBe('UNKNOWN')
    expect(result.plain).toBe(rawMessage)
    expect(result.action).toBe('Share this with your team lead or Salesforce admin for help.')
    expect(result.raw).toBe(rawMessage)
  })

  it('handles error code appearing anywhere in the message', () => {
    const rawMessage = 'Deploy failed: INSUFFICIENT_ACCESS on CustomObject__c'
    const result = translateError(rawMessage)
    expect(result.code).toBe('INSUFFICIENT_ACCESS')
  })
})
