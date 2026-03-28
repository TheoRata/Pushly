# Org Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a side-by-side org comparison feature that shows metadata differences between two Salesforce orgs, with drill-down into component properties and the ability to deploy selected changes.

**Architecture:** A new `/api/compare` route with two endpoints (inventory + detail). The inventory endpoint fetches metadata lists from both orgs in parallel using the existing `listMetadata` wrapper, then diffs them by `type:fullName` key. The detail endpoint retrieves a single component from both orgs and extracts type-specific properties. Frontend is a new `ComparePage.vue` using existing `OrgDropdown`, glass components, and a new `useCompare` composable.

**Tech Stack:** Express route, SF CLI via existing `sf-cli.js` wrappers, Vue 3 Composition API, Tailwind CSS v4, existing glass design system.

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `server/services/compare.js` | `diffInventories()`, `getComponentDetail()`, `extractProperties()` with type registry |
| `server/routes/compare.js` | `GET /api/compare/inventory`, `GET /api/compare/detail` |
| `server/tests/compare.test.js` | Unit tests for `diffInventories()` and `extractProperties()` |
| `client/src/composables/useCompare.js` | Reactive comparison state, API calls, filtering |
| `client/src/views/ComparePage.vue` | Comparison page with side-by-side panels |

### Modified Files
| File | Change |
|---|---|
| `server/index.js` | Register compare router |
| `client/src/router/index.js` | Add `/compare` route |
| `client/src/components/TopNavBar.vue` | Add "Compare" nav item |
| `client/src/views/DeployPage.vue` | Handle `fromCompare` query params |

---

### Task 1: Compare Service — diffInventories()

**Files:**
- Create: `server/services/compare.js`
- Create: `server/tests/compare.test.js`

- [ ] **Step 1: Write the test for diffInventories**

Create `server/tests/compare.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/compare.test.js`
Expected: FAIL — `Cannot find module '../services/compare.js'`

- [ ] **Step 3: Implement diffInventories**

Create `server/services/compare.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/compare.test.js`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/compare.js server/tests/compare.test.js
git commit -m "feat(compare): add diffInventories service with tests"
```

---

### Task 2: Property Extractor Registry

**Files:**
- Modify: `server/services/compare.js`
- Modify: `server/tests/compare.test.js`

- [ ] **Step 1: Write tests for extractProperties**

Add to `server/tests/compare.test.js` (update the import line to include extractProperties):

```js
import { diffInventories, extractProperties } from '../services/compare.js'
```

Then add this describe block after the existing one:

```js
describe('extractProperties', () => {
  it('extracts Flow properties', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>59.0</apiVersion>
  <status>Active</status>
  <processType>AutoLaunchedFlow</processType>
  <description>Assigns leads to reps</description>
  <label>Lead Assignment</label>
</Flow>`
    const props = extractProperties(xml, 'Flow')
    expect(props).toEqual({
      'API Version': '59.0',
      'Status': 'Active',
      'Process Type': 'AutoLaunchedFlow',
      'Description': 'Assigns leads to reps',
    })
  })

  it('extracts CustomField properties', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
  <fullName>Industry__c</fullName>
  <label>Industry</label>
  <type>Picklist</type>
  <required>false</required>
  <defaultValue>Technology</defaultValue>
</CustomField>`
    const props = extractProperties(xml, 'CustomField')
    expect(props).toEqual({
      'Label': 'Industry',
      'Field Type': 'Picklist',
      'Required': 'false',
      'Default Value': 'Technology',
    })
  })

  it('extracts ApexClass properties', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>59.0</apiVersion>
  <status>Active</status>
</ApexClass>`
    const props = extractProperties(xml, 'ApexClass')
    expect(props).toEqual({
      'API Version': '59.0',
      'Status': 'Active',
    })
  })

  it('returns fallback for unsupported types', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SomeUnknownType xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>59.0</apiVersion>
</SomeUnknownType>`
    const props = extractProperties(xml, 'SomeUnknownType')
    expect(props).toEqual({ 'API Version': '59.0' })
  })

  it('handles malformed XML gracefully', () => {
    const props = extractProperties('not xml at all', 'Flow')
    expect(props).toEqual({ error: 'Could not parse metadata' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/compare.test.js`
Expected: FAIL — `extractProperties is not a function`

- [ ] **Step 3: Implement extractProperties with registry**

Add to `server/services/compare.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/compare.test.js`
Expected: All 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/compare.js server/tests/compare.test.js
git commit -m "feat(compare): add property extractor registry with 9 types"
```

---

### Task 3: Compare Service — getComponentDetail()

**Files:**
- Modify: `server/services/compare.js`

- [ ] **Step 1: Add getComponentDetail and findMetadataFile functions**

Add these imports at the top of `server/services/compare.js`:

```js
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { retrieveMetadata } from './sf-cli.js'
```

Then add these functions:

```js
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
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `cd server && npx vitest run tests/compare.test.js`
Expected: All 11 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add server/services/compare.js
git commit -m "feat(compare): add getComponentDetail for on-demand property diff"
```

---

### Task 4: Compare API Route

**Files:**
- Create: `server/routes/compare.js`
- Modify: `server/index.js`

- [ ] **Step 1: Create server/routes/compare.js**

```js
import { Router } from 'express'
import { listMetadataTypes, listMetadata } from '../services/sf-cli.js'
import { diffInventories, getComponentDetail } from '../services/compare.js'
import { batchFetch } from '../utils/batch-fetch.js'

const router = Router()

router.get('/inventory', async (req, res) => {
  const { source, target } = req.query

  if (!source || !target) {
    return res.status(400).json({ error: 'source and target query params are required' })
  }
  if (source === target) {
    return res.status(400).json({ error: 'Source and target must be different orgs' })
  }

  try {
    const [sourceTypesRaw, targetTypesRaw] = await Promise.all([
      listMetadataTypes(source),
      listMetadataTypes(target),
    ])

    const sourceTypes = (sourceTypesRaw.metadataObjects || sourceTypesRaw || [])
      .map((t) => t.xmlName || t)
      .filter(Boolean)
    const targetTypes = (targetTypesRaw.metadataObjects || targetTypesRaw || [])
      .map((t) => t.xmlName || t)
      .filter(Boolean)

    const allTypes = [...new Set([...sourceTypes, ...targetTypes])]

    const sourceTasks = allTypes.map((type) => async () => {
      try {
        const raw = await listMetadata(source, type)
        const components = Array.isArray(raw) ? raw : [raw].filter(Boolean)
        return components.map((c) => ({
          type,
          fullName: c.fullName || c.fileName || '',
          lastModifiedDate: c.lastModifiedDate || '',
        }))
      } catch {
        return []
      }
    })

    const targetTasks = allTypes.map((type) => async () => {
      try {
        const raw = await listMetadata(target, type)
        const components = Array.isArray(raw) ? raw : [raw].filter(Boolean)
        return components.map((c) => ({
          type,
          fullName: c.fullName || c.fileName || '',
          lastModifiedDate: c.lastModifiedDate || '',
        }))
      } catch {
        return []
      }
    })

    const [sourceResults, targetResults] = await Promise.all([
      batchFetch(sourceTasks, 5),
      batchFetch(targetTasks, 5),
    ])

    const sourceComponents = sourceResults
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .filter((c) => c.fullName)

    const targetComponents = targetResults
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .filter((c) => c.fullName)

    const diff = diffInventories(sourceComponents, targetComponents)

    const skippedCount = sourceResults.filter((r) => r.status === 'rejected').length
      + targetResults.filter((r) => r.status === 'rejected').length

    res.json({
      diff,
      summary: {
        new: diff.new.length,
        modified: diff.modified.length,
        deleted: diff.deleted.length,
        unchanged: diff.unchanged.length,
        skippedTypes: skippedCount,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Comparison failed', details: err })
  }
})

router.get('/detail', async (req, res) => {
  const { source, target, type, name } = req.query

  if (!source || !target || !type || !name) {
    return res.status(400).json({ error: 'source, target, type, and name are all required' })
  }

  try {
    const detail = await getComponentDetail(source, target, type, name)
    res.json(detail)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch component detail', details: err })
  }
})

export default router
```

- [ ] **Step 2: Register route in server/index.js**

Add import after the other router imports (around line 23):

```js
import compareRouter from './routes/compare.js'
```

Add route registration after the other `app.use('/api/...')` calls:

```js
app.use('/api/compare', compareRouter)
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/routes/compare.js server/index.js
git commit -m "feat(compare): add inventory and detail API endpoints"
```

---

### Task 5: Frontend Composable — useCompare

**Files:**
- Create: `client/src/composables/useCompare.js`

- [ ] **Step 1: Create the composable**

Create `client/src/composables/useCompare.js`:

```js
import { ref, computed } from 'vue'
import { useApi } from './useApi'

const api = useApi()

const sourceOrg = ref('')
const targetOrg = ref('')
const results = ref(null)
const summary = ref(null)
const loading = ref(false)
const error = ref('')
const filter = ref('changes')
const selectedComponents = ref(new Set())
const expandedKey = ref(null)
const detailLoading = ref(false)
const detailData = ref(null)
const detailError = ref('')

async function compare(source, target) {
  loading.value = true
  error.value = ''
  results.value = null
  summary.value = null
  selectedComponents.value = new Set()
  expandedKey.value = null
  detailData.value = null

  try {
    const data = await api.get(`/compare/inventory?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`)
    results.value = data.diff
    summary.value = data.summary
  } catch (err) {
    error.value = err.message || 'Comparison failed'
  } finally {
    loading.value = false
  }
}

async function fetchDetail(type, name) {
  const key = `${type}:${name}`
  if (expandedKey.value === key) {
    expandedKey.value = null
    detailData.value = null
    return
  }

  expandedKey.value = key
  detailLoading.value = true
  detailError.value = ''
  detailData.value = null

  try {
    const data = await api.get(
      `/compare/detail?source=${encodeURIComponent(sourceOrg.value)}&target=${encodeURIComponent(targetOrg.value)}&type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`
    )
    detailData.value = data
  } catch (err) {
    detailError.value = err.message || 'Failed to fetch details'
  } finally {
    detailLoading.value = false
  }
}

function toggleSelect(type, fullName) {
  const key = `${type}:${fullName}`
  const next = new Set(selectedComponents.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  selectedComponents.value = next
}

function selectAll(components) {
  const next = new Set(selectedComponents.value)
  for (const c of components) {
    next.add(`${c.type}:${c.fullName}`)
  }
  selectedComponents.value = next
}

function clearSelection() {
  selectedComponents.value = new Set()
}

const filteredResults = computed(() => {
  if (!results.value) return []
  const { new: newItems, modified, deleted, unchanged } = results.value
  switch (filter.value) {
    case 'new': return newItems
    case 'modified': return modified
    case 'deleted': return deleted
    case 'changes': return [...newItems, ...modified, ...deleted]
    case 'all': return [...newItems, ...modified, ...deleted, ...unchanged]
    default: return [...newItems, ...modified, ...deleted]
  }
})

const selectedComponentsQuery = computed(() => {
  return [...selectedComponents.value].join(',')
})

export function useCompare() {
  return {
    sourceOrg, targetOrg, results, summary, loading, error, filter,
    selectedComponents, expandedKey, detailLoading, detailData, detailError,
    compare, fetchDetail, toggleSelect, selectAll, clearSelection,
    filteredResults, selectedComponentsQuery,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/composables/useCompare.js
git commit -m "feat(compare): add useCompare composable with filtering and selection"
```

---

### Task 6: Compare Page — Vue Component

**Files:**
- Create: `client/src/views/ComparePage.vue`

- [ ] **Step 1: Create ComparePage.vue**

This is a large file. Create `client/src/views/ComparePage.vue` with the full component. The component uses:
- `OrgDropdown` for source/target selection (with `exclude` prop to prevent same-org)
- `GlassCard`, `GlassButton`, `GlassBadge` from the glass design system
- `useCompare` composable for all state and actions
- `useRouter` for navigation to deploy wizard
- Side-by-side grid layout with `grid-cols-2`
- Filter pills, summary badges, floating action bar
- Expandable detail rows with property diff display

The component should follow the existing patterns in `DeployPage.vue` and `HistoryPage.vue` — use `var(--foreground)`, `var(--foreground-muted)`, `var(--primary)`, `var(--glass-bg)`, `var(--glass-border)` CSS variables. Use the glass components for cards, buttons, and badges.

Key sections:
1. Org selection bar (two OrgDropdowns + Compare button)
2. Loading spinner while inventory fetches
3. Summary badges (new/modified/deleted/unchanged counts)
4. Filter pills row
5. Two-column grid with source panel header and target panel header
6. Component rows: checkbox + status icon + name + type badge
7. Expandable detail panel showing source/target properties and diffs
8. Floating action bar with selection count + Deploy Selected + Send to Wizard buttons

See the spec at `docs/superpowers/specs/2026-03-27-org-comparison-design.md` for the exact layout. Follow the glass design system patterns from existing views.

- [ ] **Step 2: Commit**

```bash
git add client/src/views/ComparePage.vue
git commit -m "feat(compare): add ComparePage with side-by-side diff and selection"
```

---

### Task 7: Router and Navigation Updates

**Files:**
- Modify: `client/src/router/index.js`
- Modify: `client/src/components/TopNavBar.vue`

- [ ] **Step 1: Add route to router/index.js**

Add after the retrieve route:

```js
{ path: '/compare', name: 'compare', component: () => import('../views/ComparePage.vue') },
```

- [ ] **Step 2: Add nav item to TopNavBar.vue**

Add to `navItems` array between Retrieve and Deploy:

```js
{ label: 'Compare', to: '/compare', icon: 'columns' },
```

Add `columns` to the `icons` object:

```js
columns: 'M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zm10 0h-4a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1z',
```

- [ ] **Step 3: Build client**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/router/index.js client/src/components/TopNavBar.vue
git commit -m "feat(compare): add Compare route and nav item"
```

---

### Task 8: Deploy Wizard Integration

**Files:**
- Modify: `client/src/views/DeployPage.vue`

- [ ] **Step 1: Add fromCompare handling in onMounted**

In the `onMounted` block of `DeployPage.vue`, add handling for `fromCompare` query param (after the existing `route.query.from === 'retrieve'` block):

```js
if (route.query.fromCompare === 'true') {
  const components = (route.query.components || '').split(',').filter(Boolean)
  selectedComponents.value = components.map((c) => {
    const [type, ...nameParts] = c.split(':')
    return { type, fullName: nameParts.join(':') }
  })
  sourceOrg.value = route.query.source || ''
  targetOrg.value = route.query.target || ''

  if (selectedComponents.value.length > 0) {
    completedSteps.value = ['source', 'components', 'target']
    currentStep.value = 3
  }
}
```

Note: Match variable names to what exists in DeployPage.vue. The key behavior is: pre-populate components from the comparison and skip to the validation step.

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/views/DeployPage.vue
git commit -m "feat(compare): integrate comparison selection with deploy wizard"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Build client**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`

Verify:
1. "Compare" appears in nav between Retrieve and Deploy
2. `/compare` loads the compare page
3. Two org dropdowns render, excluding each other
4. (With two orgs authenticated) Compare button fetches inventory
5. Filter pills work
6. Clicking a modified component expands detail
7. Checking components shows floating action bar
8. "Deploy Selected" navigates to deploy wizard with query params

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore(compare): final verification and fixes"
```
