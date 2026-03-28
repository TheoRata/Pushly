/**
 * Sanitizes a string for safe use as a filename.
 * Replaces any character that is not alphanumeric, dot, hyphen, or underscore.
 * @param {string} name
 * @returns {string}
 */
export function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}
