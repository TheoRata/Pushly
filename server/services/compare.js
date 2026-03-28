import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { retrieveMetadata } from './sf-cli.js'

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

export async function getComponentDetail(sourceOrg, targetOrg, type, name) {
  const tmpBase = path.join(os.tmpdir(), `pushly-compare-${Date.now()}`)
  const sourceDir = path.join(tmpBase, 'source')
  const targetDir = path.join(tmpBase, 'target')

  for (const dir of [sourceDir, targetDir]) {
    fs.mkdirSync(path.join(dir, 'force-app', 'main', 'default'), { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'sfdx-project.json'),
      JSON.stringify({
        packageDirectories: [{ path: 'force-app', default: true }],
        sourceApiVersion: '62.0',
      })
    )
  }

  const component = { type, fullName: name }

  await Promise.allSettled([
    retrieveMetadata(sourceOrg, [component], sourceDir),
    retrieveMetadata(targetOrg, [component], targetDir),
  ])

  const sourceXml = findMetadataFile(sourceDir)
  const targetXml = findMetadataFile(targetDir)

  const sourceProps = sourceXml ? extractProperties(sourceXml, type) : { error: 'Not found in source' }
  const targetProps = targetXml ? extractProperties(targetXml, type) : { error: 'Not found in target' }

  const diffs = []
  const allKeys = new Set([...Object.keys(sourceProps), ...Object.keys(targetProps)])
  for (const key of allKeys) {
    if (key === 'error') continue
    const sv = sourceProps[key]
    const tv = targetProps[key]
    if (sv !== tv) {
      diffs.push({ property: key, source: sv || null, target: tv || null })
    }
  }

  try {
    fs.rmSync(tmpBase, { recursive: true, force: true })
  } catch {
    // Best effort cleanup
  }

  return { source: sourceProps, target: targetProps, diffs }
}

function findMetadataFile(workspaceDir) {
  const baseDir = path.join(workspaceDir, 'force-app', 'main', 'default')
  if (!fs.existsSync(baseDir)) return null

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const found = walk(fullPath)
        if (found) return found
      } else if (entry.name.endsWith('-meta.xml') || (entry.name.endsWith('.xml') && entry.name !== 'package.xml')) {
        return fs.readFileSync(fullPath, 'utf-8')
      }
    }
    return null
  }

  return walk(baseDir)
}
