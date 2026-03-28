import { Router } from 'express'
import { readRecords, readRecord } from '../services/history.js'

const router = Router()

/**
 * GET /api/history — list history records with optional filters
 * Query: user, org, status, from, to
 */
router.get('/', (req, res) => {
  const { user, org, status, from, to } = req.query

  try {
    const filters = {}
    if (user) filters.user = user
    if (org) filters.org = org
    if (status) filters.status = status
    if (from) filters.from = from
    if (to) filters.to = to

    const records = readRecords(filters)
    res.json({ records })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to read history' })
  }
})

/**
 * GET /api/history/:id — get a single history record
 */
router.get('/:id', (req, res) => {
  const { id } = req.params

  const record = readRecord(id)
  if (!record) {
    return res.status(404).json({ error: 'Record not found' })
  }

  res.json({ record })
})

export default router
