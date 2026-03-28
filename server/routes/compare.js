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
