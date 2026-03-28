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

// ── Property Extractor Registry ─────────────────────────────────────

function getTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return match ? match[1] : null
}

const extractors = {
  Flow: (xml) => ({
    'API Version': getTag(xml, 'apiVersion'),
    'Status': getTag(xml, 'status'),
    'Process Type': getTag(xml, 'processType'),
    'Description': getTag(xml, 'description'),
  }),
  CustomField: (xml) => ({
    'Label': getTag(xml, 'label'),
    'Field Type': getTag(xml, 'type'),
    'Required': getTag(xml, 'required'),
    'Default Value': getTag(xml, 'defaultValue'),
  }),
  CustomObject: (xml) => ({
    'Label': getTag(xml, 'label'),
    'Sharing Model': getTag(xml, 'sharingModel'),
    'Description': getTag(xml, 'description'),
  }),
  ApexClass: (xml) => ({
    'API Version': getTag(xml, 'apiVersion'),
    'Status': getTag(xml, 'status'),
  }),
  ApexTrigger: (xml) => ({
    'API Version': getTag(xml, 'apiVersion'),
    'Status': getTag(xml, 'status'),
  }),
  Layout: (xml) => ({
    'Layout Type': getTag(xml, 'layoutType') || 'Standard',
  }),
  PermissionSet: (xml) => ({
    'Label': getTag(xml, 'label'),
    'License': getTag(xml, 'license'),
  }),
  Profile: (xml) => ({
    'License': getTag(xml, 'userLicense'),
  }),
  ValidationRule: (xml) => {
    let formula = getTag(xml, 'formula') || ''
    if (formula.length > 200) formula = formula.slice(0, 200) + '…'
    return {
      'Active': getTag(xml, 'active'),
      'Error Message': getTag(xml, 'errorMessage'),
      'Formula': formula,
    }
  },
}

export function extractProperties(xml, metadataType) {
  if (!xml || typeof xml !== 'string' || !xml.includes('<')) {
    return { error: 'Could not parse metadata' }
  }

  const extractor = extractors[metadataType]
  if (extractor) {
    const props = extractor(xml)
    for (const key of Object.keys(props)) {
      if (props[key] === null) delete props[key]
    }
    return props
  }

  const fallback = {}
  const apiVersion = getTag(xml, 'apiVersion')
  if (apiVersion) fallback['API Version'] = apiVersion
  return fallback
}
