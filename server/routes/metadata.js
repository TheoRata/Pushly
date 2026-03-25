import { Router } from 'express'
import { listMetadataTypes, listMetadata } from '../services/sf-cli.js'

const router = Router()

// In-memory cache: Map<orgAlias, { types, components, lastRefresh }>
const cache = new Map()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

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

function getOrgCache(orgAlias) {
  const entry = cache.get(orgAlias)
  if (!entry) return null
  if (Date.now() - entry.lastRefresh > CACHE_TTL_MS) {
    cache.delete(orgAlias)
    return null
  }
  return entry
}

function setOrgCache(orgAlias, data) {
  cache.set(orgAlias, { ...data, lastRefresh: Date.now() })
}

/**
 * GET /api/metadata/:orgAlias/types — list metadata types grouped by category
 */
router.get('/:orgAlias/types', async (req, res) => {
  const { orgAlias } = req.params

  try {
    const cached = getOrgCache(orgAlias)
    let metadataTypes

    if (cached?.types) {
      metadataTypes = cached.types
    } else {
      const result = await listMetadataTypes(orgAlias)
      metadataTypes = result.metadataObjects || result || []
      setOrgCache(orgAlias, { ...getOrgCache(orgAlias), types: metadataTypes })
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
    const cached = getOrgCache(orgAlias)
    const cacheKey = `components_${type}`

    if (cached?.[cacheKey]) {
      return res.json({ components: cached[cacheKey] })
    }

    const components = await listMetadata(orgAlias, type)
    const componentList = Array.isArray(components) ? components : [components].filter(Boolean)

    // Cache the result
    const existing = getOrgCache(orgAlias) || {}
    setOrgCache(orgAlias, { ...existing, [cacheKey]: componentList })

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

  const cached = getOrgCache(orgAlias)
  if (!cached) {
    return res.json({ results: [], message: 'No cached metadata. Refresh first.' })
  }

  const query = q.toLowerCase()
  const results = []

  // Search through all cached component lists
  for (const [key, value] of Object.entries(cached)) {
    if (!key.startsWith('components_') || !Array.isArray(value)) continue
    const typeName = key.replace('components_', '')

    for (const component of value) {
      const fullName = (component.fullName || component.name || '').toLowerCase()
      if (fullName.includes(query)) {
        results.push({ ...component, metadataType: typeName })
      }
    }
  }

  res.json({ results })
})

/**
 * POST /api/metadata/:orgAlias/refresh — clear cache and reload types
 */
router.post('/:orgAlias/refresh', async (req, res) => {
  const { orgAlias } = req.params

  try {
    cache.delete(orgAlias)
    const result = await listMetadataTypes(orgAlias)
    const metadataTypes = result.metadataObjects || result || []
    setOrgCache(orgAlias, { types: metadataTypes })

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
