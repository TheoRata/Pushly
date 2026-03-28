/**
 * Compares two metadata inventory lists and categorizes components.
 *
 * @param {Array<{type: string, fullName: string, lastModifiedDate: string}>} sourceList
 * @param {Array<{type: string, fullName: string, lastModifiedDate: string}>} targetList
 * @returns {{ new: Array, modified: Array, deleted: Array, unchanged: Array }}
 */
export function diffInventories(sourceList, targetList) {
  const sourceMap = new Map()
  const targetMap = new Map()

  for (const item of sourceList) {
    sourceMap.set(`${item.type}:${item.fullName}`, item)
  }
  for (const item of targetList) {
    targetMap.set(`${item.type}:${item.fullName}`, item)
  }

  const result = { new: [], modified: [], deleted: [], unchanged: [] }

  for (const [key, sourceItem] of sourceMap) {
    const targetItem = targetMap.get(key)
    if (!targetItem) {
      result.new.push({ ...sourceItem, status: 'new' })
    } else if (sourceItem.lastModifiedDate !== targetItem.lastModifiedDate) {
      result.modified.push({
        ...sourceItem,
        status: 'modified',
        targetLastModifiedDate: targetItem.lastModifiedDate,
      })
    } else {
      result.unchanged.push({ ...sourceItem, status: 'unchanged' })
    }
  }

  for (const [key, targetItem] of targetMap) {
    if (!sourceMap.has(key)) {
      result.deleted.push({ ...targetItem, status: 'deleted' })
    }
  }

  return result
}
