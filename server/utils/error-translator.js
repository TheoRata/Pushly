/**
 * Maps raw Salesforce error codes to plain-English explanations.
 */

const ERROR_TABLE = {
  FIELD_INTEGRITY_EXCEPTION: {
    plain: 'A required field is missing or a lookup references something that doesn\'t exist in the target org.',
    action: 'Check that all referenced objects and fields exist in the target org.',
  },
  INSUFFICIENT_ACCESS: {
    plain: 'Your user doesn\'t have permission to deploy this component.',
    action: 'Ask your Salesforce admin for the "Modify Metadata" permission in the target org.',
  },
  DUPLICATE_VALUE: {
    plain: 'This component already exists in the target org with a different configuration.',
    action: 'Check the existing component in the target org and resolve the conflict manually.',
  },
  UNKNOWN_EXCEPTION: {
    plain: 'Salesforce encountered an unexpected error.',
    action: 'Try again in a few minutes. If it persists, note the ErrorId and contact Salesforce support.',
  },
  TEST_FAILURE: {
    plain: 'Apex tests failed in the target org during deployment.',
    action: 'Fix the failing test classes or deploy with "Skip Tests" if available for sandboxes.',
  },
  MISSING_REQUIRED_FIELD: {
    plain: 'A required field on a record or component is not set.',
    action: 'Check that all required fields are populated in your source metadata.',
  },
  INVALID_CROSS_REFERENCE_KEY: {
    plain: 'A reference points to a record or component that doesn\'t exist in the target org.',
    action: 'Deploy the referenced component first, then retry.',
  },
  FIELD_CUSTOM_VALIDATION_EXCEPTION: {
    plain: 'A validation rule is blocking the deployment.',
    action: 'Check validation rules in the target org that may conflict.',
  },
}

/**
 * Translates a raw Salesforce error message into a structured, user-friendly object.
 * @param {string} rawMessage - The raw error message from Salesforce CLI
 * @returns {{ code: string, plain: string, action: string, raw: string }}
 */
export function translateError(rawMessage) {
  for (const [code, entry] of Object.entries(ERROR_TABLE)) {
    if (rawMessage.includes(code)) {
      return { code, plain: entry.plain, action: entry.action, raw: rawMessage }
    }
  }
  return {
    code: 'UNKNOWN',
    plain: rawMessage,
    action: 'Share this with your team lead or Salesforce admin for help.',
    raw: rawMessage,
  }
}
