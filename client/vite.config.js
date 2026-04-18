import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT_FILE = join(__dirname, '..', '.dev-port')
const DEFAULT_PORT = 3000
const WAIT_TIMEOUT_MS = 10000
const POLL_INTERVAL_MS = 200

async function resolveServerPort() {
  const deadline = Date.now() + WAIT_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const raw = fs.readFileSync(PORT_FILE, 'utf8').trim()
      const port = Number(raw)
      if (Number.isInteger(port) && port > 0) return port
    } catch {}
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  console.warn(`[vite] .dev-port not found after ${WAIT_TIMEOUT_MS}ms, falling back to :${DEFAULT_PORT}`)
  return DEFAULT_PORT
}

export default defineConfig(async () => {
  const port = await resolveServerPort()
  const httpTarget = `http://localhost:${port}`
  const wsTarget = `ws://localhost:${port}`
  console.log(`[vite] proxying /api and /ws to ${httpTarget}`)
  return {
    plugins: [vue(), tailwindcss()],
    server: {
      proxy: {
        '/api': httpTarget,
        '/ws': {
          target: wsTarget,
          ws: true,
        },
      },
    },
  }
})
