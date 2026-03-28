/**
 * Operations Manager — tracks running operations and broadcasts progress via WebSocket.
 */

const operations = new Map() // operationId -> { id, type, status, components, log, result, startedAt, metadata }
const wsClients = new Set()

/**
 * Creates a new operation entry with status 'running'.
 */
export function createOperation(id, type, metadata = {}) {
  const entry = {
    id,
    type,
    status: 'running',
    components: metadata.components || [],
    log: [],
    result: null,
    startedAt: new Date().toISOString(),
    metadata,
  }
  operations.set(id, entry)

  broadcast({
    event: 'operation:started',
    data: { operationId: id, type, status: 'running', metadata },
  })

  return entry
}

/**
 * Updates an operation and broadcasts progress to all WS clients.
 */
export function updateOperation(id, update) {
  const op = operations.get(id)
  if (!op) return

  // Merge update fields
  Object.assign(op, update)

  // Append to log
  if (update.message) {
    op.log.push({
      timestamp: new Date().toISOString(),
      component: update.component || null,
      status: update.status || op.status,
      message: update.message,
    })
  }

  broadcast({
    event: 'operation:progress',
    data: {
      operationId: id,
      component: update.component || null,
      status: update.status || op.status,
      message: update.message || null,
    },
  })
}

/**
 * Marks an operation as completed or failed and broadcasts the result.
 */
export function completeOperation(id, result) {
  const op = operations.get(id)
  if (!op) return

  const status = result.error ? 'failed' : 'completed'
  op.status = status
  op.result = result
  op.completedAt = new Date().toISOString()

  broadcast({
    event: 'operation:complete',
    data: {
      operationId: id,
      status,
      summary: result,
    },
  })
}

/**
 * Returns operation data by id.
 */
export function getOperation(id) {
  return operations.get(id) || null
}

/**
 * Returns all operations with status === 'running'.
 */
export function getActiveOperations() {
  return Array.from(operations.values()).filter((op) => op.status === 'running')
}

/**
 * Registers a WebSocket client for broadcasts.
 */
export function registerClient(ws) {
  wsClients.add(ws)
}

/**
 * Unregisters a WebSocket client.
 */
export function unregisterClient(ws) {
  wsClients.delete(ws)
}

/**
 * Broadcasts a message to all connected WebSocket clients.
 */
function broadcast(message) {
  const payload = JSON.stringify(message)
  for (const ws of wsClients) {
    try {
      if (ws.readyState === 1) {
        // WebSocket.OPEN
        ws.send(payload)
      }
    } catch {
      // Client disconnected — will be cleaned up on close event
    }
  }
}

/**
 * Removes completed/failed operations older than maxAgeMs.
 * Returns the number of removed operations.
 * @param {number} maxAgeMs - Maximum age in milliseconds (default: 1 hour)
 * @returns {number}
 */
export function cleanupCompletedOperations(maxAgeMs = 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs
  let removed = 0
  for (const [id, op] of operations) {
    if (op.completedAt && new Date(op.completedAt).getTime() < cutoff) {
      operations.delete(id)
      removed++
    }
  }
  return removed
}

/**
 * Resets all state — for testing only.
 */
export function _resetForTest() {
  operations.clear()
  wsClients.clear()
}
