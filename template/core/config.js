import fs from 'node:fs'
import path from 'node:path'
import app from '../config/app'
import database from '../config/database'
import auth from '../config/auth'
import queue from '../config/queue'
import storage from '../config/storage'
import { appConfig } from './runtime'

function getValue(source, key) {
  return key.split('.').reduce((value, part) => value?.[part], source)
}

export function loadConfig() {
  const cacheFile = path.resolve(process.cwd(), 'storage/framework/cache/config.json')
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    } catch {
      // Ignore incomplete cache writes and fall back to source config.
    }
  }

  return {
    app,
    auth,
    database,
    queue,
    storage,
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
