import { WebSocketServer } from 'ws'

export class WebSocketHub {
  constructor() {
    this.wss = null
  }

  attach(httpServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' })
    this.wss.on('connection', (socket) => {
      socket.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }))
    })
  }

  emit(type, data) {
    if (!this.wss) return
    const payload = JSON.stringify({ type, data })
    for (const client of this.wss.clients) {
      if (client.readyState === 1) client.send(payload)
    }
  }

  async close() {
    if (!this.wss) return
    await new Promise((resolve) => this.wss.close(() => resolve()))
    this.wss = null
  }
}
