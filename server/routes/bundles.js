import { Router } from 'express'
import { listBundles, saveBundle, deleteBundle } from '../services/bundles.js'

const router = Router()

/**
 * GET /api/bundles — list all saved bundles
 */
router.get('/', (req, res) => {
  try {
    const bundles = listBundles()
    res.json({ bundles })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list bundles' })
  }
})

/**
 * POST /api/bundles — create a new bundle
 * Body: { name, components }
 */
router.post('/', (req, res) => {
  const { name, components } = req.body

  if (!name || !components || !Array.isArray(components)) {
    return res.status(400).json({ error: 'name and components array are required' })
  }

  try {
    const bundle = saveBundle(name, components)
    res.status(201).json({ bundle })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create bundle' })
  }
})

/**
 * PUT /api/bundles/:name — update a bundle
 */
router.put('/:name', (req, res) => {
  const { name } = req.params
  const { components } = req.body

  if (!components || !Array.isArray(components)) {
    return res.status(400).json({ error: 'components array is required' })
  }

  try {
    const bundle = saveBundle(name, components)
    res.json({ bundle })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update bundle' })
  }
})

/**
 * DELETE /api/bundles/:name — delete a bundle
 */
router.delete('/:name', (req, res) => {
  const { name } = req.params

  const deleted = deleteBundle(name)
  if (!deleted) {
    return res.status(404).json({ error: 'Bundle not found' })
  }

  res.json({ status: 'deleted', name })
})

export default router
