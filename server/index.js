import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import open from 'open'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

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
  ws.on('message', (data) => {
    console.log('WS received:', data.toString())
  })
})

// Port detection: try 3000-3010
async function findPort(start = 3000, end = 3010) {
  for (let port = start; port <= end; port++) {
    try {
      await new Promise((resolve, reject) => {
        server.listen(port, () => resolve())
        server.once('error', reject)
      })
      return port
    } catch {
      if (port === end) throw new Error(`No available port in range ${start}-${end}`)
    }
  }
}

// Start unless imported for testing
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isMainModule) {
  const port = await findPort()
  console.log(`Server listening on http://localhost:${port}`)
  open(`http://localhost:${port}`)
}

export { app, server, wss }
