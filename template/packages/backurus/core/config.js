import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { appConfig } from './runtime'

function getValue(source, key) {
  return key.split('.').reduce((value, part) => value?.[part], source)
}

async function importProjectConfig(name) {
  const file = path.resolve(process.cwd(), 'config', `${name}.js`)
  try {
    await fsp.access(file)
  } catch {
    return null
  }
  const mod = await import(pathToFileURL(file).href)
  return mod.default ?? null
}

export async function loadConfig() {
  const cacheFile = path.resolve(process.cwd(), 'storage/framework/cache/config.json')
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    } catch {
      // Ignore incomplete cache writes and fall back to source config.
    }
  }

  const [app, auth, cache, database, queue, storage] = await Promise.all([
    importProjectConfig('app'),
    importProjectConfig('auth'),
    importProjectConfig('cache'),
    importProjectConfig('database'),
    importProjectConfig('queue'),
    importProjectConfig('storage')
  ])

  return {
    app: app || {},
    auth: auth || {},
    cache: cache || {},
    database: database || {},
    queue: queue || {},
    storage: storage || {},
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173',
      methods: process.env.CORS_METHODS || 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      headers: process.env.CORS_HEADERS || 'Content-Type, Authorization, X-Requested-With',
      exposedHeaders: process.env.CORS_EXPOSE_HEADERS || '',
      maxAge: Number(process.env.CORS_MAX_AGE || 86400),
      credentials: ['1', 'true', 'yes'].includes(String(process.env.CORS_CREDENTIALS || '').toLowerCase())
    },
    rateLimit: {
      max: Number(process.env.RATE_LIMIT_MAX || 100),
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)
    }
  }
}

export function config(key = null, fallback = null) {
  if (!key) return appConfig
  return getValue(appConfig, key) ?? fallback
}
