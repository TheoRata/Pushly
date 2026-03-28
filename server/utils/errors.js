/**
 * Creates a standardized error response object.
 * All API error responses should use this shape for consistency.
 *
 * @param {string} message - Human-readable error message
 * @param {object} [options] - Additional error context
 * @param {string} [options.code] - Machine-readable error code
 * @param {string} [options.action] - Suggested action for the user
 * @param {Array}  [options.failures] - Component-level failures
 * @param {object} [options.details] - Additional details
 * @returns {{ error: { message: string, code?: string, action?: string, failures?: Array, details?: object } }}
 */
export function errorResponse(message, options = {}) {
  const error = { message }
  if (options.code) error.code = options.code
  if (options.action) error.action = options.action
  if (options.failures) error.failures = options.failures
  if (options.details) error.details = options.details
  return { error }
}
