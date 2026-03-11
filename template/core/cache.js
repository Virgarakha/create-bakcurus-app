import Redis from 'ioredis'

export class CacheStore {
  constructor() {
    this.store = new Map()
  }

  put(key, value, ttlMs = null) {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null
    this.store.set(key, { value, expiresAt })
    return value
  }

  get(key, fallback = null) {
    const item = this.store.get(key)
    if (!item) return fallback
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key)
      return fallback
    }
    return item.value
  }

  forget(key) {
    this.store.delete(key)
  }

  flush() {
    this.store.clear()
  }
}

export class RedisCacheStore {
  constructor(config = {}) {
    this.prefix = config.prefix || 'backurus:'
    this.redis = new Redis(config.redis || {})
  }

  _key(key) {
    return `${this.prefix}${key}`
  }

  async put(key, value, ttlMs = null) {
    const payload = JSON.stringify(value)
    if (ttlMs) {
      await this.redis.set(this._key(key), payload, 'PX', Number(ttlMs))
      return value
    }
    await this.redis.set(this._key(key), payload)
    return value
  }

  async get(key, fallback = null) {
    const raw = await this.redis.get(this._key(key))
    if (!raw) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }

  async forget(key) {
    await this.redis.del(this._key(key))
  }

  async flush() {
    // Flush only keys with prefix if possible.
    const stream = this.redis.scanStream({ match: `${this.prefix}*`, count: 200 })
    const keys = []
    await new Promise((resolve, reject) => {
      stream.on('data', (batch) => keys.push(...batch))
      stream.on('error', reject)
      stream.on('end', resolve)
    })
    if (keys.length) await this.redis.del(keys)
  }
}
