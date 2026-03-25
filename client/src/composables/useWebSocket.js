import { ref, onUnmounted } from 'vue'

let socket = null
let listeners = {}
let reconnectTimer = null
const connected = ref(false)

function getWsUrl() {
  const loc = window.location
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:'
  // In dev, the API runs on port 3000; in production same host
  const host = import.meta.env.DEV ? `${loc.hostname}:3000` : loc.host
  return `${protocol}//${host}`
}

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  socket = new WebSocket(getWsUrl())

  socket.onopen = () => {
    connected.value = true
  }

  socket.onclose = () => {
    connected.value = false
    socket = null
    // Auto-reconnect after 2 seconds
    clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(connect, 2000)
  }

  socket.onerror = () => {
    // onclose will fire after onerror, triggering reconnect
  }

  socket.onmessage = (event) => {
    let msg
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }

    const type = msg.event || msg.type
    if (type && listeners[type]) {
      // Pass the inner data payload to callbacks, not the full envelope
      listeners[type].forEach((cb) => cb(msg.data || msg))
    }
  }
}

// Initialise connection on first import
connect()

export function useWebSocket() {
  function on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = []
    }
    listeners[event].push(callback)
  }

  function off(event, callback) {
    if (!listeners[event]) return
    listeners[event] = listeners[event].filter((cb) => cb !== callback)
  }

  // Clean up listeners registered by the calling component on unmount
  const localListeners = []

  function onScoped(event, callback) {
    on(event, callback)
    localListeners.push({ event, callback })
  }

  onUnmounted(() => {
    localListeners.forEach(({ event, callback }) => off(event, callback))
  })

  return { on: onScoped, off, connected }
}
