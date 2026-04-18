import { Router } from 'express'
import { listMetadataTypes, listMetadata } from '../services/sf-cli.js'
import { batchFetch } from '../utils/batch-fetch.js'
import {
  getCachedTypes, setCachedTypes,
  getCachedComponents, setCachedComponents,
  clearOrgCache, isCacheStale,
} from '../services/metadata-cache.js'

const router = Router()

const CATEGORY_MAP = {
  // Apex Code
  ApexClass: 'Apex Code',
  ApexTrigger: 'Apex Code',
  ApexComponent: 'Apex Code',
  ApexPage: 'Apex Code',
  ApexTestSuite: 'Apex Code',
  // Automation
  Flow: 'Automation',
  FlowDefinition: 'Automation',
  WorkflowRule: 'Automation',
  WorkflowAlert: 'Automation',
  WorkflowFieldUpdate: 'Automation',
  WorkflowTask: 'Automation',
  WorkflowOutboundMessage: 'Automation',
  ProcessFlowMigration: 'Automation',
  // Objects & Fields
  CustomObject: 'Objects & Fields',
  CustomField: 'Objects & Fields',
  RecordType: 'Objects & Fields',
  ValidationRule: 'Objects & Fields',
  FieldSet: 'Objects & Fields',
  BusinessProcess: 'Objects & Fields',
  WebLink: 'Objects & Fields',
  CustomIndex: 'Objects & Fields',
  ListView: 'Objects & Fields',
  // Layouts & Pages
  Layout: 'Layouts & Pages',
  FlexiPage: 'Layouts & Pages',
  CompactLayout: 'Layouts & Pages',
  HomePageLayout: 'Layouts & Pages',
  HomePageComponent: 'Layouts & Pages',
  CustomPageWebLink: 'Layouts & Pages',
  // Lightning Components
  LightningComponentBundle: 'Lightning Components',
  AuraDefinitionBundle: 'Lightning Components',
  // Profiles & Permissions
  PermissionSet: 'Profiles & Permissions',
  PermissionSetGroup: 'Profiles & Permissions',
  Profile: 'Profiles & Permissions',
  MutingPermissionSet: 'Profiles & Permissions',
  // Sharing & Security
  SharingRules: 'Sharing & Security',
  SharingCriteriaRule: 'Sharing & Security',
  SharingOwnerRule: 'Sharing & Security',
  CustomPermission: 'Sharing & Security',
  // Reports & Dashboards
  Report: 'Reports & Dashboards',
  Dashboard: 'Reports & Dashboards',
  ReportType: 'Reports & Dashboards',
  AnalyticSnapshot: 'Reports & Dashboards',
  // Email & Templates
  EmailTemplate: 'Email & Templates',
  Letterhead: 'Email & Templates',
  // Tabs & Apps
  CustomTab: 'Tabs & Apps',
  CustomApplication: 'Tabs & Apps',
  ConnectedApp: 'Tabs & Apps',
  AppMenu: 'Tabs & Apps',
  // Custom Labels & Translations
  CustomLabel: 'Custom Labels & Translations',
  CustomLabels: 'Custom Labels & Translations',
  Translations: 'Custom Labels & Translations',
  GlobalValueSet: 'Custom Labels & Translations',
  StandardValueSet: 'Custom Labels & Translations',
  GlobalValueSetTranslation: 'Custom Labels & Translations',
  // Custom Metadata & Settings
  CustomMetadata: 'Custom Metadata & Settings',
  CustomSetting: 'Custom Metadata & Settings',
  CustomObject__mdt: 'Custom Metadata & Settings',
  // Static Resources & Files
  StaticResource: 'Static Resources & Files',
  ContentAsset: 'Static Resources & Files',
  Document: 'Static Resources & Files',
  // Platform Events & Messaging
  PlatformEventChannel: 'Platform Events',
  PlatformEventChannelMember: 'Platform Events',
  CustomNotificationType: 'Platform Events',
  // Quick Actions
  QuickAction: 'Quick Actions',
  // Data Integration
  ExternalDataSource: 'Data Integration',
  NamedCredential: 'Data Integration',
  ExternalServiceRegistration: 'Data Integration',
  RemoteSiteSetting: 'Data Integration',
  // Sites & Communities
  CustomSite: 'Sites & Communities',
  Network: 'Sites & Communities',
  ExperienceBundle: 'Sites & Communities',
  // Path & Guidance
  PathAssistant: 'Path & Guidance',
  // Duplicate Management
  DuplicateRule: 'Duplicate Management',
  MatchingRules: 'Duplicate Management',
  MatchingRule: 'Duplicate Management',
  // Assignment & Escalation
  AssignmentRules: 'Assignment & Escalation',
  AssignmentRule: 'Assignment & Escalation',
  AutoResponseRules: 'Assignment & Escalation',
  AutoResponseRule: 'Assignment & Escalation',
  EscalationRules: 'Assignment & Escalation',
  EscalationRule: 'Assignment & Escalation',
  // Queues & Groups
  Queue: 'Queues & Groups',
  Group: 'Queues & Groups',
  // Clean-up: any metadata type maps to its own name as category
}


/**
 * GET /api/metadata/:orgAlias/types — list metadata types grouped by category
 */
router.get('/:orgAlias/types', async (req, res) => {
  const { orgAlias } = req.params

  try {
    let metadataTypes = getCachedTypes(orgAlias)

    if (!metadataTypes) {
      const result = await listMetadataTypes(orgAlias)
      metadataTypes = result.metadataObjects || result || []
      setCachedTypes(orgAlias, metadataTypes)
    }

    // Group into categories
    const grouped = {}
    for (const mt of metadataTypes) {
      const typeName = mt.xmlName || mt
      const category = CATEGORY_MAP[typeName] || typeName
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(mt)
    }

    res.json({ types: grouped })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list metadata types', details: err })
  }
})

/**
 * GET /api/metadata/:orgAlias/components?type=Flow — list components of a type
 */
router.get('/:orgAlias/components', async (req, res) => {
  const { orgAlias } = req.params
  const { type } = req.query

  if (!type) {
    return res.status(400).json({ error: 'type query parameter is required' })
  }

  try {
    const cached = getCachedComponents(orgAlias, type)
    if (cached) {
      return res.json({ components: cached })
    }

    const components = await listMetadata(orgAlias, type)
    const componentList = Array.isArray(components) ? components : [components].filter(Boolean)

    // Don't cache empty results — may be a transient "not ready" response
    // from a freshly authenticated org. See batch-components for rationale.
    if (componentList.length > 0) {
      setCachedComponents(orgAlias, type, componentList)
    }

    res.json({ components: componentList })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list components', details: err })
  }
})

/**
 * GET /api/metadata/:orgAlias/search?q=Lead — search cached metadata
 */
router.get('/:orgAlias/search', async (req, res) => {
  const { orgAlias } = req.params
  const { q } = req.query

  if (!q) {
    return res.status(400).json({ error: 'q query parameter is required' })
  }

  const types = getCachedTypes(orgAlias)
  if (!types) {
    return res.json({ results: [], message: 'No cached metadata. Refresh first.' })
  }

  const query = q.toLowerCase()
  const results = []

  // Search through all cached component lists
  for (const mt of types) {
    const typeName = mt.xmlName || mt
    const components = getCachedComponents(orgAlias, typeName)
    if (!Array.isArray(components)) continue

    for (const component of components) {
      const fullName = (component.fullName || component.name || '').toLowerCase()
      if (fullName.includes(query)) {
        results.push({ ...component, metadataType: typeName })
      }
    }
  }

  res.json({ results })
})

/**
 * POST /api/metadata/:orgAlias/batch-components
 * Body: { types: ["Flow", "ApexClass", ...] }
 * Response: { results: { "Flow": [...], "ApexClass": [...] } }
 *
 * Fetches multiple metadata types in a single request using controlled
 * concurrency (max 5 parallel SF CLI calls). Checks the disk cache first
 * and only fetches types that are not already cached.
 */
router.post('/:orgAlias/batch-components', async (req, res) => {
  const { orgAlias } = req.params
  const { types, skipCache } = req.body

  if (!Array.isArray(types) || types.length === 0) {
    return res.status(400).json({ error: 'types must be a non-empty array' })
  }

  const output = {}

  // Separate types into those already cached and those that need fetching.
  const uncachedTypes = []

  for (const type of types) {
    if (skipCache) {
      uncachedTypes.push(type)
      continue
    }
    const cached = getCachedComponents(orgAlias, type)
    if (cached) {
      output[type] = cached
    } else {
      uncachedTypes.push(type)
    }
  }

  if (uncachedTypes.length === 0) {
    return res.json({ results: output })
  }

  // Build one task per uncached type
  const tasks = uncachedTypes.map((type) => async () => {
    const raw = await listMetadata(orgAlias, type)
    const components = Array.isArray(raw) ? raw : [raw].filter(Boolean)
    // Don't cache empty results — a newly authenticated org may not be ready
    // for metadata queries yet (OAuth token propagation, org provisioning).
    // Caching empty would make the tree look permanently empty until the
    // user hits "hard refresh". Only cache when we got real data.
    if (components.length > 0) {
      setCachedComponents(orgAlias, type, components)
    }
    return { type, components }
  })

  try {
    const settled = await batchFetch(tasks, 5)

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { type, components } = result.value
        output[type] = components
      } else {
        // Surface the error under the type key so the client can react per-type
        const type = uncachedTypes[settled.indexOf(result)]
        output[type] = { error: result.reason?.message || 'Failed to fetch' }
      }
    }

    res.json({ results: output })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Batch fetch failed', details: err })
  }
})

/**
 * POST /api/metadata/:orgAlias/refresh — clear cache and reload types
 */
router.post('/:orgAlias/refresh', async (req, res) => {
  const { orgAlias } = req.params

  try {
    clearOrgCache(orgAlias)
    const result = await listMetadataTypes(orgAlias)
    const metadataTypes = result.metadataObjects || result || []
    setCachedTypes(orgAlias, metadataTypes)

    // Group into categories for the response
    const grouped = {}
    for (const mt of metadataTypes) {
      const typeName = mt.xmlName || mt
      const category = CATEGORY_MAP[typeName] || typeName
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(mt)
    }

    res.json({ types: grouped, refreshed: true })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to refresh metadata', details: err })
  }
})

export default router
