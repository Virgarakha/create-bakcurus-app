import dotenv from 'dotenv'
import { Server } from './server.js'
import { Container } from './container.js'
import { loadConfig } from './config.js'
import { loadPlugins } from './plugin.js'
import { loadRoutes } from './router.js'
import { loadModules } from './modules.js'
import { ResponseFactory } from './response.js'
import { EventBus } from './events.js'
import { QueueManager } from './queue.js'
import { WebSocketHub } from './websocket.js'
import { registerDocsRoute } from './swagger.js'
import { DatabaseManager } from './database.js'
import { CacheStore, RedisCacheStore } from './cache.js'
import { Logger } from './log.js'
import { GateRegistry } from './gate.js'
import { Scheduler, loadSchedule } from './scheduler.js'
import { authMiddleware } from './auth.js'
import { StorageManager } from './storage.js'
import { setRuntimeConfig } from './runtime.js'
import { registerGlobals } from './helpers/register.js'

dotenv.config()

export async function createApp() {
  const config = await loadConfig()
  setRuntimeConfig(config)

  const container = new Container()
  const events = new EventBus(container)
  const queue = new QueueManager(config, container)
  const db = new DatabaseManager(config.database)
  await db.connect()
  const ws = new WebSocketHub()
  const cache = config.cache?.driver === 'redis'
    ? new RedisCacheStore(config.cache)
    : new CacheStore()
  const gate = new GateRegistry()
  const scheduler = new Scheduler()
  const storage = new StorageManager(config.storage)
  const log = new Logger({ basePath: 'storage/logs' })

  container.singleton('config', () => config)
  container.singleton('db', () => db)
  container.singleton('events', () => events)
  container.singleton('queue', () => queue)
  container.singleton('ws', () => ws)
  container.singleton('cache', () => cache)
  container.singleton('log', () => log)
  container.singleton('gate', () => gate)
  container.singleton('scheduler', () => scheduler)
  container.singleton('storage', () => storage)
  container.singleton('response', () => new ResponseFactory())

  const server = new Server({ config, container, db, events, queue, ws })
  server.router.aliasMiddleware('auth', authMiddleware(container))
  registerGlobals()

  await loadPlugins({ container, config, events, queue, server, ws })
  await loadModules(server.router, { container, config, events, queue, server, ws })
  await loadRoutes(server.router, { container, config, events, queue, ws })
  await loadSchedule(scheduler)
  registerDocsRoute(server.router)

  return server
}

