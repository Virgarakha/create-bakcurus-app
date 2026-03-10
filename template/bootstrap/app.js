import dotenv from 'dotenv'
import { Server } from '../core/server'
import { Container } from '../core/container'
import { loadConfig } from '../core/config'
import { loadPlugins } from '../core/plugin'
import { loadRoutes } from '../core/router'
import { ResponseFactory } from '../core/response'
import { EventBus } from '../core/events'
import { QueueManager } from '../core/queue'
import { WebSocketHub } from '../core/websocket'
import { registerDocsRoute } from '../core/swagger'
import { DatabaseManager } from '../core/database'
import { CacheStore } from '../core/cache'
import { GateRegistry } from '../core/gate'
import { Scheduler, loadSchedule } from '../core/scheduler'
import { authMiddleware } from '../core/auth'
import { StorageManager } from '../core/storage'
import SendWelcomeEmail from '../app/listeners/SendWelcomeEmail'
import UserRegistered from '../app/events/UserRegistered'
import { setRuntimeConfig } from '../core/runtime'

dotenv.config()

export async function createApp() {
  const config = loadConfig()
  setRuntimeConfig(config)
  const container = new Container()
  const events = new EventBus(container)
  const queue = new QueueManager(config, container)
  const db = new DatabaseManager(config.database)
  await db.connect()
  const ws = new WebSocketHub()
  const cache = new CacheStore()
  const gate = new GateRegistry()
  const scheduler = new Scheduler()
  const storage = new StorageManager(config.storage)

  container.singleton('config', () => config)
  container.singleton('db', () => db)
  container.singleton('events', () => events)
  container.singleton('queue', () => queue)
  container.singleton('ws', () => ws)
  container.singleton('cache', () => cache)
  container.singleton('gate', () => gate)
  container.singleton('scheduler', () => scheduler)
  container.singleton('storage', () => storage)
  container.singleton('response', () => new ResponseFactory())

  const server = new Server({ config, container, db, events, queue, ws })
  server.router.aliasMiddleware('auth', authMiddleware(container))

  events.listen(UserRegistered.name, SendWelcomeEmail)
  queue.register('SendEmailJob', async (job, runtimeContainer) => {
    runtimeContainer.make('ws').emit('notification', {
      message: `Queued welcome email for ${job.user.email}`
    })
  })

  await loadPlugins({ container, config, events, queue, server, ws })
  await loadRoutes(server.router, { container, config, events, queue, ws })
  await loadSchedule(scheduler)
  registerDocsRoute(server.router)

  return server
}
