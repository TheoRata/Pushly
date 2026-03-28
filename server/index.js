import express from 'express'
import fs from 'node:fs'
import { createServer } from 'http'
import { createServer as createNetServer } from 'net'
import { WebSocketServer } from 'ws'
import open from 'open'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { cleanupStaleLocks } from './services/lock.js'
import { cleanupOldWorkspaces } from './services/workspace.js'
import { cleanupOldSnapshots } from './services/rollback.js'
import { archiveOldRecords } from './services/history.js'
import { registerClient, unregisterClient, getActiveOperations } from './services/operations.js'
import { initCache } from './services/metadata-cache.js'

import { checkPrerequisites } from './utils/prerequisites.js'
import orgsRouter from './routes/orgs.js'
import metadataRouter from './routes/metadata.js'
import retrieveRouter from './routes/retrieve.js'
import deployRouter from './routes/deploy.js'
import historyRouter from './routes/history.js'
import bundlesRouter from './routes/bundles.js'
import compareRouter from './routes/compare.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize data directories
const baseDir = join(__dirname, '..')
const dataDir = join(baseDir, 'data')
;['history', 'history/archive', 'bundles', 'rollbacks'].forEach((dir) => {
  fs.mkdirSync(join(dataDir, dir), { recursive: true })
})

// Cleanup on startup
cleanupStaleLocks(dataDir)
cleanupOldWorkspaces(30, baseDir)
cleanupOldSnapshots(90, dataDir)
archiveOldRecords(dataDir, 180)

// Initialize metadata cache from disk
initCache(baseDir)

const app = express()
app.use(express.json())

// Make paths available to routes
app.locals.dataDir = dataDir
app.locals.baseDir = baseDir

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Prerequisites check
app.get('/api/prerequisites', (_req, res) => {
  res.json(checkPrerequisites())
})

// API routes
app.use('/api/orgs', orgsRouter)
app.use('/api/metadata', metadataRouter)
app.use('/api/retrieve', retrieveRouter)
app.use('/api/deploy', deployRouter)
app.use('/api/history', historyRouter)
app.use('/api/bundles', bundlesRouter)
app.use('/api/compare', compareRouter)

// Static files (production build)
const clientDist = join(__dirname, '..', 'client', 'dist')
app.use(express.static(clientDist))

// SPA fallback — non-API routes serve index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(join(clientDist, 'index.html'))
})

// HTTP + WebSocket server
const server = createServer(app)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  registerClient(ws)

  // Send any active operations on connect (for tab reconnect)
  const active = getActiveOperations()
  if (active.length) {
    ws.send(JSON.stringify({ event: 'operations:active', data: active }))
  }

  ws.on('message', (data) => {
    console.log('WS received:', data.toString())
  })

  ws.on('close', () => unregisterClient(ws))
})

// Port detection: try 3000-3010 using a temporary net server to test availability
async function findPort(start = 3000, end = 3010) {
  for (let port = start; port <= end; port++) {
    const available = await new Promise((resolve) => {
      const tester = createNetServer()
      tester.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false)
        } else {
          throw err // Don't swallow non-port-conflict errors
        }
      })
      tester.listen(port, () => {
        tester.close(() => resolve(true))
      })
    })
    if (available) {
      await new Promise((resolve, reject) => {
        server.listen(port, resolve)
        server.once('error', reject)
      })
      return port
    }
  }
  throw new Error(`No available port in range ${start}-${end}`)
}

// Start unless imported for testing
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isMainModule) {
  const port = await findPort()
  console.log(`Server listening on http://localhost:${port}`)
  open(`http://localhost:${port}`)
}

export { app, server, wss }
